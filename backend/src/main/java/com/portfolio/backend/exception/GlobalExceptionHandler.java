package com.portfolio.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * One place that turns exceptions into HTTP responses, so no controller needs a try/catch.
 *
 * <p>{@code @RestControllerAdvice} registers these handlers across every controller. Responses
 * use {@link ProblemDetail} (RFC 9457), the standard error shape Spring 6+ ships — so the
 * frontend can rely on {@code status}, {@code title} and {@code detail} always being present
 * rather than each endpoint inventing its own error JSON.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Resource not found", ex.getMessage(), "not-found");
    }

    /**
     * No controller matches the path. Without this the catch-all below reports a plain typo'd
     * URL as a 500 and logs it as a server crash.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoRoute(NoResourceFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Not found", "No endpoint at this address", "not-found");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethod(HttpRequestMethodNotSupportedException ex) {
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed", ex.getMessage(), "method-not-allowed");
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ProblemDetail handleDuplicate(DuplicateResourceException ex) {
        return problem(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), "conflict");
    }

    /**
     * Raised when {@code @Valid} fails. Collects every field error rather than just the first,
     * so a form can highlight all its problems in one round trip.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST, "Validation failed", "One or more fields are invalid", "validation");
        problem.setProperty("errors", errors);
        return problem;
    }

    /**
     * Bad credentials land here. The message is deliberately vague and the log line carries the
     * detail — the client learns only that it failed.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        log.warn("Authentication failure: {}", ex.getMessage());
        return problem(HttpStatus.UNAUTHORIZED, "Unauthorized",
                "Invalid username or password", "unauthorized");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "Forbidden",
                "You do not have permission to perform this action", "forbidden");
    }

    /**
     * Unparseable request body — malformed JSON, a bad enum value, invalid UTF-8. Without this
     * handler these fall through to the catch-all and report 500, blaming the server for what
     * is squarely a client error.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadable(HttpMessageNotReadableException ex) {
        log.debug("Unreadable request body: {}", ex.getMessage());
        return problem(HttpStatus.BAD_REQUEST, "Malformed request",
                "Request body could not be parsed. Check that it is valid UTF-8 JSON.", "malformed");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        return problem(HttpStatus.BAD_REQUEST, "Bad request", ex.getMessage(), "bad-request");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        // UNPROCESSABLE_CONTENT, not UNPROCESSABLE_ENTITY: RFC 9110 renamed 422 and Spring 7
        // deprecated the old constant. Same status code, current name.
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "Unprocessable", ex.getMessage(), "unprocessable");
    }

    /**
     * The catch-all. Logs the stack trace but returns a generic message: internal details
     * (SQL fragments, class names, file paths) are exactly what an attacker wants to see.
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error",
                "Something went wrong. Please try again.", "internal");
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String type) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create("https://portfolio.local/errors/" + type));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
