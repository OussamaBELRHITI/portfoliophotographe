package com.portfolio.backend.repository;

import com.portfolio.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Extending {@link JpaRepository} is all it takes — Spring Data generates the implementation at
 * startup and registers it as a bean, so there is no DAO class to write. save/findById/delete
 * and friends come for free.
 *
 * <p>The methods below are <em>derived queries</em>: Spring parses the method name and writes
 * the JPQL. A typo like {@code findBySlugg} fails loudly when the context starts, not at the
 * first request.
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Sidebar + gallery index for the public site: hidden categories never leave the database. */
    List<Category> findAllByVisibleTrueOrderByDisplayOrderAsc();

    /** Admin dashboard listing — shows hidden ones too. */
    List<Category> findAllByOrderByDisplayOrderAsc();
}
