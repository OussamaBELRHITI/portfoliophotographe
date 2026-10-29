package com.portfolio.backend.service;

import com.portfolio.backend.dto.CategoryRequest;
import com.portfolio.backend.dto.CategoryResponse;
import com.portfolio.backend.dto.ReorderRequest;
import com.portfolio.backend.entity.Category;
import com.portfolio.backend.entity.Media;
import com.portfolio.backend.entity.MediaType;
import com.portfolio.backend.exception.DuplicateResourceException;
import com.portfolio.backend.exception.ResourceNotFoundException;
import com.portfolio.backend.repository.CategoryRepository;
import com.portfolio.backend.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Category management.
 *
 * <p>{@code @Transactional} at class level with {@code readOnly = true} makes reads the default
 * and forces writes to opt in. Read-only transactions let Hibernate skip dirty-checking, and
 * more importantly the annotation documents intent: a method without an override is not
 * supposed to change anything.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final MediaRepository mediaRepository;

    /** Public site: visible categories only. */
    public List<CategoryResponse> getVisibleCategories() {
        return toResponses(categoryRepository.findAllByVisibleTrueOrderByDisplayOrderAsc(), true);
    }

    /** Admin dashboard: everything, including hidden. */
    public List<CategoryResponse> getAllCategories() {
        return toResponses(categoryRepository.findAllByOrderByDisplayOrderAsc(), false);
    }

    /** Admin lookup — returns the category whether it is visible or not. */
    public CategoryResponse getBySlug(String slug) {
        return toResponses(List.of(getEntityBySlug(slug, false)), false).get(0);
    }

    /** Public lookup — a hidden category must be indistinguishable from one that never existed. */
    public CategoryResponse getVisibleBySlug(String slug) {
        return toResponses(List.of(getEntityBySlug(slug, true)), true).get(0);
    }

    /**
     * @param mustBeVisible when true, a hidden category raises the same 404 as a missing one.
     *                      Returning 403 instead would confirm the slug exists, which is exactly
     *                      the information a hidden gallery is meant to withhold.
     */
    public Category getEntityBySlug(String slug, boolean mustBeVisible) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No category with slug '" + slug + "'"));

        if (mustBeVisible && !category.isVisible()) {
            throw new ResourceNotFoundException("No category with slug '" + slug + "'");
        }
        return category;
    }

    public Category getEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Category", id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String slug = resolveSlug(request);
        if (categoryRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("A category with slug '" + slug + "' already exists");
        }

        Category category = new Category();
        category.setName(request.name());
        category.setSlug(slug);
        category.setDescription(request.description());
        // New categories default to hidden so the photographer can fill a gallery before it
        // appears on the live site.
        category.setVisible(request.visible() != null && request.visible());
        category.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : nextDisplayOrder());

        Category saved = categoryRepository.save(category);
        log.info("Created category '{}' (slug={})", saved.getName(), saved.getSlug());
        return CategoryResponse.from(saved, 0, null);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getEntityById(id);

        String slug = resolveSlug(request);
        // Only complain if the slug now belongs to a *different* category.
        if (!slug.equals(category.getSlug()) && categoryRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("A category with slug '" + slug + "' already exists");
        }

        category.setName(request.name());
        category.setSlug(slug);
        category.setDescription(request.description());
        if (request.visible() != null) {
            category.setVisible(request.visible());
        }
        if (request.displayOrder() != null) {
            category.setDisplayOrder(request.displayOrder());
        }

        // No save() call: category is managed, so JPA flushes at commit.
        return toResponses(List.of(category), false).get(0);
    }

    /** The hide/show toggle behind the dashboard switch. */
    @Transactional
    public CategoryResponse setVisibility(Long id, boolean visible) {
        Category category = getEntityById(id);
        category.setVisible(visible);
        log.info("Category '{}' set to {}", category.getSlug(), visible ? "visible" : "hidden");
        return toResponses(List.of(category), false).get(0);
    }

    /**
     * Deleting a category leaves its media in place — the stored files still exist and the
     * photographer may want to re-file them. The rows are simply orphaned (category_id null).
     */
    @Transactional
    public void delete(Long id) {
        Category category = getEntityById(id);

        List<Media> orphaned = mediaRepository.findByCategoryIdOrderByDisplayOrderAsc(id);
        orphaned.forEach(m -> m.setCategory(null));

        categoryRepository.delete(category);
        log.info("Deleted category '{}', detached {} media item(s)", category.getSlug(), orphaned.size());
    }

    @Transactional
    public void reorder(ReorderRequest request) {
        List<Long> ids = request.orderedIds();
        Map<Long, Category> byId = categoryRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));

        for (int i = 0; i < ids.size(); i++) {
            Category category = byId.get(ids.get(i));
            if (category == null) {
                throw ResourceNotFoundException.of("Category", ids.get(i));
            }
            category.setDisplayOrder(i);
        }
        log.info("Reordered {} categories", ids.size());
    }

    /**
     * Builds the response objects, including each category's media count and cover image.
     *
     * <p>Looking the media up inside the stream would fire one query per category — the classic
     * N+1. Instead this fetches every relevant row in a single {@code IN (...)} query and groups
     * them in memory, so the whole listing costs two queries regardless of category count.
     */
    private List<CategoryResponse> toResponses(List<Category> categories, boolean visibleMediaOnly) {
        if (categories.isEmpty()) {
            return List.of();
        }

        List<Long> categoryIds = categories.stream().map(Category::getId).toList();

        List<Media> allMedia = visibleMediaOnly
                ? mediaRepository.findByCategoryIdInAndVisibleTrueOrderByDisplayOrderAsc(categoryIds)
                : mediaRepository.findByCategoryIdInOrderByDisplayOrderAsc(categoryIds);

        // groupingBy preserves the encounter order of the source list within each group, so the
        // displayOrder sort from the query survives and index 0 really is the cover image.
        Map<Long, List<Media>> byCategoryId = allMedia.stream()
                .collect(Collectors.groupingBy(m -> m.getCategory().getId()));

        return categories.stream()
                .map(category -> {
                    List<Media> media = byCategoryId.getOrDefault(category.getId(), List.of());
                    // A category can hold both photos and videos, but this cover feeds an
                    // <Image> on the Work index — the first IMAGE, not just the first item,
                    // or a video-led category would hand the frontend a video URL to render
                    // as a static thumbnail.
                    String cover = media.stream()
                            .filter(m -> m.getType() == MediaType.IMAGE)
                            .findFirst()
                            // Thumbnail where there is one: the index draws these small, and
                            // a cover is the one image on that page guaranteed to be fetched.
                            .map(m -> m.getThumbnailUrl() != null ? m.getThumbnailUrl() : m.getUrl())
                            .orElse(null);
                    return CategoryResponse.from(category, media.size(), cover);
                })
                .toList();
    }

    private int nextDisplayOrder() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .mapToInt(Category::getDisplayOrder)
                .max()
                .orElse(-1) + 1;
    }

    private String resolveSlug(CategoryRequest request) {
        if (request.slug() != null && !request.slug().isBlank()) {
            return request.slug();
        }
        return slugify(request.name());
    }

    /**
     * "Portraits & Béton" -> "portraits-beton".
     *
     * <p>Normalizer.Form.NFD splits accented characters into base letter + combining mark, so
     * stripping the marks leaves plain ASCII rather than dropping the letter entirely.
     */
    static String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "category" : slug;
    }
}
