package com.portfolio.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Turns a {@code Authorization: Bearer <token>} header into an authenticated request.
 *
 * <p>Runs once per request (that is what {@link OncePerRequestFilter} guarantees — without it a
 * forward or error dispatch could re-run the logic). The job is narrow: if there is a valid
 * token, populate the {@link SecurityContextHolder}; otherwise do nothing and let the chain
 * continue. Rejecting the request is not this filter's decision — that belongs to the
 * authorization rules in SecurityConfig, which is why an invalid token falls through silently
 * rather than returning 401 from here.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = extractToken(request);

        // The second half of this condition matters: if something earlier in the chain already
        // authenticated the request, overwriting it here would be a downgrade.
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtService.parse(token).ifPresent(claims -> authenticate(claims, request));
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(Claims claims, HttpServletRequest request) {
        String username = claims.getSubject();
        String role = claims.get("role", String.class);

        // Trusting the signed claim instead of reloading the user from the database is the
        // whole point of a stateless token — it keeps read endpoints to a single query.
        // The trade-off: a role change or account disable only takes effect once the current
        // token expires. With a 12-hour lifetime that is an acceptable window here; if it
        // stopped being acceptable, the fix is a shorter expiry plus refresh tokens.
        var authorities = role == null
                ? List.<SimpleGrantedAuthority>of()
                : List.of(new SimpleGrantedAuthority("ROLE_" + role));

        var authentication = new UsernamePasswordAuthenticationToken(username, null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            return header.substring(PREFIX.length()).trim();
        }
        return null;
    }
}
