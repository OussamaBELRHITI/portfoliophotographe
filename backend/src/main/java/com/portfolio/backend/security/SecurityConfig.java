package com.portfolio.backend.security;

import com.portfolio.backend.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * The security rules for the whole API.
 *
 * <p>Shape of the policy: everything under {@code /api/public/**} is readable because the
 * portfolio is a public website; everything under {@code /api/admin/**} requires a valid token.
 * The public API is read-only: no anonymous write is permitted anywhere.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AppProperties appProperties;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF protects against a browser silently replaying a session cookie. We have
                // no cookies and no sessions — the token travels in a header that a malicious
                // site cannot make the browser attach — so the protection has nothing to do
                // here.
                .csrf(csrf -> csrf.disable())

                // STATELESS: never create an HttpSession, and never consult one. Every request
                // must carry its own proof of identity. This is what makes the backend safe to
                // run as several instances behind a load balancer without sticky sessions.
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Without this, an unauthenticated request to a protected path is reported as
                // 403 Forbidden — Spring treats the anonymous user as "known but not allowed".
                // 401 is the correct answer to "you sent no credentials", and the dashboard
                // relies on the distinction to decide between redirecting to login (401) and
                // showing a permission error (403).
                .exceptionHandling(ex ->
                        ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

                .authorizeHttpRequests(auth -> auth
                        // Browsers fire an unauthenticated OPTIONS preflight before any
                        // cross-origin request carrying an Authorization header.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()

                        // Uploaded photographs. Public by nature — this is a portfolio, and in
                        // production the proxy serves them off disk without reaching Spring at
                        // all; the rule matters for a deployment without a proxy in front.
                        .requestMatchers(HttpMethod.GET, "/media/**").permitAll()

                        .requestMatchers("/actuator/health").permitAll()

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )

                // Order matters. Our filter has to run before the username/password filter so
                // that by the time authorization is evaluated, the SecurityContext is populated.
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * BCrypt deliberately runs slowly and salts each hash, so two admins with the same password
     * get different hashes and offline cracking stays expensive. Never store a plain SHA of a
     * password — it is far too fast to brute-force.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Wires the user lookup to the password check. The login endpoint calls into this to verify
     * credentials, rather than comparing hashes by hand.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AdminUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider::authenticate;
    }

    /**
     * Without this the Next.js dev server on :3000 cannot call the API on :8080 — the browser
     * blocks the response. Origins come from config so the Vercel domain can be added at deploy
     * time without a rebuild.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(appProperties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
