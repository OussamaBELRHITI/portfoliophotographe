package com.portfolio.backend.repository;

import com.portfolio.backend.entity.Media;
import com.portfolio.backend.entity.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MediaRepository extends JpaRepository<Media, Long> {

    /**
     * {@code CategoryId} walks the association: Spring Data turns it into a join on
     * {@code category_id} rather than expecting a literal {@code categoryId} field.
     */
    List<Media> findByCategoryIdAndVisibleTrueOrderByDisplayOrderAsc(Long categoryId);

    List<Media> findByCategoryIdOrderByDisplayOrderAsc(Long categoryId);

    /** Backs the standalone video section. */
    List<Media> findByTypeAndVisibleTrueOrderByDisplayOrderAsc(MediaType type);

    /** Backs the Film section's per-category listing — the video equivalent of a gallery. */
    List<Media> findByCategoryIdAndTypeAndVisibleTrueOrderByDisplayOrderAsc(Long categoryId, MediaType type);

    /**
     * Batch variants used when building the category list: one query for every category's media
     * instead of one query per category. {@code In} maps to a SQL {@code IN (...)} clause.
     */
    List<Media> findByCategoryIdInOrderByDisplayOrderAsc(Collection<Long> categoryIds);

    List<Media> findByCategoryIdInAndVisibleTrueOrderByDisplayOrderAsc(Collection<Long> categoryIds);

    /** Guards against a double-submitted upload creating two rows for the same object. */
    Optional<Media> findByStorageKey(String storageKey);

    /** Next free slot when appending to a gallery, so new uploads land at the end. */
    Optional<Media> findFirstByCategoryIdOrderByDisplayOrderDesc(Long categoryId);

    /** Hero candidates for the home page, best first. */
    List<Media> findByFeaturedTrueAndVisibleTrueOrderByDisplayOrderAsc();

    /** Newest visible item, used as the hero fallback when nothing is flagged featured. */
    Optional<Media> findFirstByVisibleTrueAndTypeOrderByCreatedAtDesc(MediaType type);
}
