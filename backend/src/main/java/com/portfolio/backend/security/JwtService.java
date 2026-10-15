package com.portfolio.backend.security;

import com.portfolio.backend.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and validates the JWTs the admin dashboard authenticates with.
 *
 * <p>This class is deliberately the only place that knows the token format. Everything else —
 * the login endpoint, the filter — deals in "give me a token for this user" and "who does this
 * token belong to", so swapping HMAC for RSA later touches one file.
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;
    private final String issuer;

    /**
     * Constructor injection, not field injection. Spring sees a single constructor and wires
     * {@link AppProperties} in automatically — no {@code @Autowired} needed since Spring 4.3.
     * The upside over {@code @Autowired} fields is that the dependencies are final and the
     * class is trivially constructible in a unit test.
     */
    public JwtService(AppProperties properties) {
        AppProperties.Jwt jwt = properties.jwt();
        // Keys.hmacShaKeyFor rejects anything under 256 bits, which is a useful guardrail:
        // a short secret makes the signature brute-forceable, and it fails at startup here
        // rather than silently issuing weak tokens.
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwt.secret()));
        this.expirationMs = jwt.expirationMs();
        this.issuer = jwt.issuer();
    }

    public String generateToken(String username, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                // "sub" — who the token is about. The filter reads this back.
                .subject(username)
                // Custom claim so authorization decisions don't need a database hit per request.
                .claim("role", role)
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Returns the token's claims, or empty if it is expired, tampered with, or not ours.
     *
     * <p>Returning {@link Optional} rather than throwing is a deliberate choice: an invalid
     * token is an entirely expected condition on a public endpoint, not an exceptional one.
     */
    public Optional<Claims> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    // verifyWith checks the signature. Without it, anyone could craft a token
                    // claiming to be the admin — the payload is only base64, not encrypted.
                    .verifyWith(signingKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Rejected JWT: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
