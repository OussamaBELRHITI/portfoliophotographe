package com.portfolio.backend.service;

import com.portfolio.backend.dto.MediaCreateRequest;
import com.portfolio.backend.dto.MediaResponse;
import com.portfolio.backend.dto.MediaUpdateRequest;
import com.portfolio.backend.dto.ReorderRequest;
import com.portfolio.backend.entity.Category;
import com.portfolio.backend.entity.Media;
import com.portfolio.backend.entity.MediaType;
import com.portfolio.backend.exception.DuplicateResourceException;
import com.portfolio.backend.exception.ResourceNotFoundException;
import com.portfolio.backend.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaService {

    private final MediaRepository mediaRepository;
    private final CategoryService categoryService;
    private final CloudinaryService cloudinaryService;

    public List<MediaResponse> getByCategory(Long categoryId, boolean visibleOnly) {
        List<Media> media = visibleOnly
                ? mediaRepository.findByCategoryIdAndVisibleTrueOrderByDisplayOrderAsc(categoryId)
                : mediaRepository.findByCategoryIdOrderByDisplayOrderAsc(categoryId);
        return media.stream().map(m -> MediaResponse.from(m, categoryId)).toList();
    }

    /**
     * @param visibleOnly also gates the category itself, so requesting the media of a hidden
     *                    gallery by slug 404s rather than exposing its contents.
     */
    public List<MediaResponse> getBySlug(String slug, boolean visibleOnly) {
        Category category = categoryService.getEntityBySlug(slug, visibleOnly);
        // A category can hold both photos and videos (see getVideosBySlug), but this backs the
        // Work gallery specifically, which renders every item through next/image — filtered
        // here rather than in getByCategory, since the admin media list reuses that method and
        // deliberately shows both types mixed together.
        return getByCategory(category.getId(), visibleOnly).stream()
                .filter(m -> m.type() == MediaType.IMAGE)
                .toList();
    }

    /** Backs the standalone video section on the public site. */
    public List<MediaResponse> getVideos() {
        return mediaRepository.findByTypeAndVisibleTrueOrderByDisplayOrderAsc(MediaType.VIDEO)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * The films filed under one category — the video equivalent of {@link #getBySlug}.
     *
     * <p>Categories are shared between photos and videos (a "Weddings" category can hold both),
     * so this reuses the same taxonomy as the Work section rather than maintaining a second,
     * film-specific one.
     */
    public List<MediaResponse> getVideosBySlug(String slug, boolean visibleOnly) {
        Category category = categoryService.getEntityBySlug(slug, visibleOnly);
        return mediaRepository
                .findByCategoryIdAndTypeAndVisibleTrueOrderByDisplayOrderAsc(category.getId(), MediaType.VIDEO)
                .stream()
                .map(m -> MediaResponse.from(m, category.getId()))
                .toList();
    }

    public List<MediaResponse> getAll() {
        return mediaRepository.findAll().stream().map(this::toResponse).toList();
    }

    /**
     * The home page hero.
     *
     * <p>Prefers whatever the photographer flagged featured; falls back to the newest visible
     * image so a brand-new site still looks intentional before anyone has chosen one. Returns
     * empty only when there is genuinely no visible media, which the frontend renders as a
     * typographic hero rather than a broken image.
     */
    public Optional<MediaResponse> getHero() {
        List<Media> featured = mediaRepository.findByFeaturedTrueAndVisibleTrueOrderByDisplayOrderAsc();
        if (!featured.isEmpty()) {
            return Optional.of(toResponse(featured.get(0)));
        }
        return mediaRepository
                .findFirstByVisibleTrueAndTypeOrderByCreatedAtDesc(MediaType.IMAGE)
                .map(this::toResponse);
    }

    /** Everything flagged featured — drives the "selected work" strip on the home page. */
    public List<MediaResponse> getFeatured() {
        return mediaRepository.findByFeaturedTrueAndVisibleTrueOrderByDisplayOrderAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public Media getEntityById(Long id) {
        return mediaRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Media", id));
    }

    /**
     * Step 5 of the upload flow: record an asset the browser has already pushed to Cloudinary.
     */
    @Transactional
    public MediaResponse create(MediaCreateRequest request) {
        // The unique constraint on cloudinary_public_id would catch this too, but checking here
        // produces a clean 409 instead of a database constraint violation surfacing as a 500.
        mediaRepository.findByCloudinaryPublicId(request.publicId()).ifPresent(existing -> {
            throw new DuplicateResourceException(
                    "Media with Cloudinary public ID '" + request.publicId() + "' already exists");
        });

        Media media = new Media();
        media.setTitle(request.title());
        media.setDescription(request.description());
        media.setCloudinaryUrl(request.url());
        media.setCloudinaryPublicId(request.publicId());
        media.setType(request.type());
        media.setWidth(request.width());
        media.setHeight(request.height());
        media.setFormat(request.format());
        media.setBytes(request.bytes());
        media.setDurationSeconds(request.durationSeconds());
        media.setVisible(request.visible() == null || request.visible());

        Long categoryId = null;
        if (request.categoryId() != null) {
            Category category = categoryService.getEntityById(request.categoryId());
            media.setCategory(category);
            categoryId = category.getId();
            // Append to the end of the gallery so a new upload never displaces existing work.
            media.setDisplayOrder(nextDisplayOrder(category.getId()));
        }

        Media saved = mediaRepository.save(media);
        log.info("Registered {} media '{}' (publicId={})",
                saved.getType(), saved.getTitle(), saved.getCloudinaryPublicId());
        return MediaResponse.from(saved, categoryId);
    }

    @Transactional
    public MediaResponse update(Long id, MediaUpdateRequest request) {
        Media media = getEntityById(id);

        if (request.title() != null) {
            media.setTitle(request.title());
        }
        if (request.description() != null) {
            media.setDescription(request.description());
        }
        if (request.visible() != null) {
            media.setVisible(request.visible());
        }
        if (request.featured() != null) {
            media.setFeatured(request.featured());
        }
        if (request.displayOrder() != null) {
            media.setDisplayOrder(request.displayOrder());
        }
        if (request.categoryId() != null) {
            Category category = categoryService.getEntityById(request.categoryId());
            media.setCategory(category);
            media.setDisplayOrder(nextDisplayOrder(category.getId()));
        } else if (Boolean.TRUE.equals(request.removeFromCategory())) {
            media.setCategory(null);
        }

        return toResponse(media);
    }

    /**
     * Deletes the row and the Cloudinary asset behind it.
     *
     * <p>Order matters. Cloudinary goes first: if that call fails we abort and keep the row, so
     * the admin can retry. Deleting the row first and then failing would strand the file in
     * Cloudinary with nothing left pointing at it — an invisible, unbillable-to-anyone orphan.
     */
    @Transactional
    public void delete(Long id) {
        Media media = getEntityById(id);
        cloudinaryService.deleteAsset(media.getCloudinaryPublicId(), media.getType());
        mediaRepository.delete(media);
        log.info("Deleted media {} (publicId={})", id, media.getCloudinaryPublicId());
    }

    /** Applies a drag-and-drop reorder within one gallery. */
    @Transactional
    public void reorder(ReorderRequest request) {
        List<Long> ids = request.orderedIds();
        Map<Long, Media> byId = mediaRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Media::getId, Function.identity()));

        for (int i = 0; i < ids.size(); i++) {
            Media media = byId.get(ids.get(i));
            if (media == null) {
                throw ResourceNotFoundException.of("Media", ids.get(i));
            }
            media.setDisplayOrder(i);
        }
        log.info("Reordered {} media items", ids.size());
    }

    private int nextDisplayOrder(Long categoryId) {
        return mediaRepository.findFirstByCategoryIdOrderByDisplayOrderDesc(categoryId)
                .map(m -> m.getDisplayOrder() + 1)
                .orElse(0);
    }

    /**
     * Reading {@code getCategory().getId()} does not initialise the lazy proxy — Hibernate can
     * answer an identifier lookup from the proxy itself — so this stays a single query.
     */
    private MediaResponse toResponse(Media media) {
        Long categoryId = media.getCategory() == null ? null : media.getCategory().getId();
        return MediaResponse.from(media, categoryId);
    }
}
