package com.portfolio.backend.service;

import com.portfolio.backend.config.AppProperties;
import com.portfolio.backend.dto.StoredFile;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

/**
 * Stores uploaded photos and videos on this server's own disk.
 *
 * <p>No object-store, no bucket, no credentials: the files live in a directory that Docker
 * mounts as a volume, and the reverse proxy serves them straight from there. Reads never enter
 * this application at all, which is both faster than proxying them through Java and one less
 * thing to go wrong.
 *
 * <p>The trade-off, chosen deliberately: an upload's bytes pass through this server instead of
 * going directly to a storage service. For a single photographer publishing his own work that
 * costs one occupied request thread for the duration of the upload, and the stream goes to disk
 * rather than into memory, so a 400 MB video does not become a 400 MB heap allocation.
 */
@Slf4j
@Service
public class StorageService {

    private final AppProperties.Storage config;
    private final Path root;

    public StorageService(AppProperties properties) {
        this.config = properties.storage();
        this.root = Path.of(config.directory()).toAbsolutePath().normalize();
    }

    @PostConstruct
    void ensureDirectory() {
        try {
            Files.createDirectories(root);
            log.info("Media directory ready at {}", root);
        } catch (IOException ex) {
            // Not fatal: the gallery should still serve when the disk is unwritable. Uploads
            // fail loudly at the point of use instead, where the admin can see it.
            log.error("Could not create media directory {}: {}", root, ex.getMessage());
        }
    }

    /**
     * Writes one uploaded file and returns where it landed.
     *
     * @param file     the part as received; its bytes are streamed, never held whole in memory
     * @param original the client's filename, used only to keep a recognisable extension
     */
    public StoredFile store(MultipartFile file, String original) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was uploaded");
        }

        String key = objectKey(original != null ? original : file.getOriginalFilename());
        Path target = resolve(key);

        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Could not save the uploaded file: " + ex.getMessage(), ex);
        }

        log.info("Stored {} ({} bytes)", key, file.getSize());
        return new StoredFile(key, publicUrl(key), file.getSize());
    }

    /** Removes a stored file. A file that is already gone is not an error — the goal is absence. */
    public void delete(String key) {
        if (key == null || key.isBlank()) return;
        try {
            Files.deleteIfExists(resolve(key));
            log.info("Deleted stored file '{}'", key);
        } catch (IOException ex) {
            // Deliberately not swallowed: the caller keeps the database row so the admin can
            // retry, rather than stranding a file nobody can see or remove.
            throw new IllegalStateException("Failed to delete '%s'".formatted(key), ex);
        }
    }

    /** The address a browser fetches this file from. */
    public String publicUrl(String key) {
        String base = config.publicBaseUrl();
        return base.endsWith("/") ? base + key : base + "/" + key;
    }

    /**
     * Resolves a key under the media root, refusing anything that escapes it.
     *
     * <p>Keys are generated here, not supplied by clients — but delete() takes one from a
     * database row, and a row is only ever as trustworthy as everything that could write to it.
     * A key of {@code ../../application.yml} must not resolve outside the media directory.
     */
    private Path resolve(String key) {
        Path candidate = root.resolve(key).normalize();
        if (!candidate.startsWith(root)) {
            throw new IllegalArgumentException("Refusing to touch a path outside the media directory");
        }
        return candidate;
    }

    /**
     * A date-partitioned, randomised key.
     *
     * <p>The random name matters twice over: two exports both called {@code DSC_0001.jpg} would
     * otherwise overwrite one another, and a guessable name would let anyone walk the directory
     * by trying filenames. Date folders keep any one directory from growing to tens of
     * thousands of entries, which some filesystems handle poorly.
     */
    private static String objectKey(String filename) {
        String ext = "";
        int dot = filename == null ? -1 : filename.lastIndexOf('.');
        if (dot > -1 && dot < filename.length() - 1) {
            // Whitelist, not blacklist: this ends up in a filesystem path and a URL.
            ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            if (ext.length() > 5) ext = ext.substring(0, 5);
        }
        String id = UUID.randomUUID().toString().replace("-", "");
        LocalDate today = LocalDate.now();
        String name = ext.isEmpty() ? id : id + "." + ext;
        return "%d/%02d/%s".formatted(today.getYear(), today.getMonthValue(), name);
    }
}
