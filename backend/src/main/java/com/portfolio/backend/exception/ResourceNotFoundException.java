package com.portfolio.backend.exception;

/**
 * Thrown by services when a requested row does not exist.
 *
 * <p>Unchecked on purpose: services shouldn't have to declare {@code throws} up the whole call
 * chain for a condition the controller layer handles generically.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String resource, Object id) {
        return new ResourceNotFoundException("%s not found with id %s".formatted(resource, id));
    }
}
