package com.portfolio.backend.exception;

/** Thrown when a uniqueness rule is violated — a category slug that is already taken. */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
