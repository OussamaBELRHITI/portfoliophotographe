package com.portfolio.backend.controller;

import com.portfolio.backend.dto.auth.AccountUpdateRequest;
import com.portfolio.backend.dto.auth.LoginRequest;
import com.portfolio.backend.dto.auth.LoginResponse;
import com.portfolio.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * {@code @RestController} is {@code @Controller} + {@code @ResponseBody}: every return value is
 * serialised to the response body rather than resolved as a view name.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * {@code @Valid} triggers the constraints declared on {@link LoginRequest}. A violation
     * throws before the method body runs, and GlobalExceptionHandler turns it into a 400 with
     * per-field messages.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Lets the dashboard check on load whether a stored token is still good, without having to
     * decode the JWT in the browser. {@link Authentication} is resolved from the SecurityContext
     * that JwtAuthenticationFilter populated.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        ));
    }

    /**
     * The signed-in admin changes their own username and/or password. Covered by
     * {@code anyRequest().authenticated()}, so it needs a valid token like /me does.
     */
    @PutMapping("/account")
    public ResponseEntity<LoginResponse> updateAccount(
            Authentication authentication,
            @Valid @RequestBody AccountUpdateRequest request
    ) {
        return ResponseEntity.ok(authService.updateAccount(authentication.getName(), request));
    }
}
