package com.portfolio.backend.entity;

/**
 * Distinguishes the photo galleries from the video section. S3-style storage calls these
 * "resource types" and reports which one it stored, so this is set from the upload response
 * rather than guessed from the file extension.
 */
public enum MediaType {
    IMAGE,
    VIDEO
}
