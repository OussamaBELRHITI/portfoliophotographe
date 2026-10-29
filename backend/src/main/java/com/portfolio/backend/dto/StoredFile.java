package com.portfolio.backend.dto;

/**
 * Where an uploaded file landed.
 *
 * @param key       its path under the media directory, kept so it can be deleted later
 * @param url       where a browser reads it from
 * @param bytes     size on disk
 */
public record StoredFile(String key, String url, long bytes) {
}
