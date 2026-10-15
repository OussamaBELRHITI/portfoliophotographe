package com.portfolio.backend.service;

import com.portfolio.backend.config.AppProperties;
import com.portfolio.backend.dto.CloudinarySignatureResponse;
import com.portfolio.backend.entity.MediaType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

/**
 * Everything that requires the Cloudinary API secret.
 *
 * <p>The secret never leaves this class. The browser gets a <em>signature</em> — a hash proving
 * this server authorised one specific upload — which is useless for anything else.
 */
@Slf4j
@Service
public class CloudinaryService {

    private static final String API_BASE = "https://api.cloudinary.com/v1_1";

    private final AppProperties.Cloudinary config;
    private final RestClient restClient;

    public CloudinaryService(AppProperties properties) {
        this.config = properties.cloudinary();
        // RestClient.create() rather than an injected RestClient.Builder: Boot 4 does not
        // auto-configure that builder bean unless a REST client starter is on the classpath,
        // and this service only ever calls one well-known host.
        this.restClient = RestClient.create();
    }

    /**
     * Step 2 of the upload flow: hand the dashboard a signature for one upload.
     *
     * <p>The signature covers the timestamp and the destination folder. Because the timestamp is
     * signed, Cloudinary rejects the request if it is replayed much later; because the folder is
     * signed, a modified request can't scatter files outside the portfolio folder.
     */
    public CloudinarySignatureResponse createUploadSignature() {
        requireConfigured();

        long timestamp = Instant.now().getEpochSecond();

        // TreeMap keeps the keys sorted, which the signing algorithm requires. Only the params
        // the browser will actually send are included — an extra or missing one breaks the hash.
        Map<String, String> params = new TreeMap<>();
        params.put("timestamp", String.valueOf(timestamp));
        params.put("folder", config.uploadFolder());

        String signature = sign(params);

        return new CloudinarySignatureResponse(
                signature,
                timestamp,
                config.apiKey(),
                config.cloudName(),
                config.uploadFolder(),
                "%s/%s/auto/upload".formatted(API_BASE, config.cloudName())
        );
    }

    /**
     * Removes the asset from Cloudinary.
     *
     * <p>Videos live under a different resource type than images, and calling the wrong endpoint
     * silently reports "not found" rather than failing — hence the explicit mapping.
     */
    public void deleteAsset(String publicId, MediaType type) {
        if (!config.isConfigured()) {
            log.warn("Cloudinary not configured; skipping remote delete of '{}'", publicId);
            return;
        }

        long timestamp = Instant.now().getEpochSecond();
        Map<String, String> params = new TreeMap<>();
        params.put("public_id", publicId);
        params.put("timestamp", String.valueOf(timestamp));

        String signature = sign(params);
        String resourceType = type == MediaType.VIDEO ? "video" : "image";

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("public_id", publicId);
        form.add("timestamp", String.valueOf(timestamp));
        form.add("api_key", config.apiKey());
        form.add("signature", signature);

        try {
            String response = restClient.post()
                    .uri("%s/%s/%s/destroy".formatted(API_BASE, config.cloudName(), resourceType))
                    .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);

            log.info("Cloudinary destroy '{}' -> {}", publicId, response);
        } catch (RestClientException ex) {
            // Surfaced as a 5xx by the global handler. Deliberately not swallowed: the caller
            // aborts the database delete so the admin can retry rather than silently losing
            // track of a file that still exists and still counts against storage quota.
            throw new IllegalStateException(
                    "Failed to delete asset '%s' from Cloudinary".formatted(publicId), ex);
        }
    }

    /**
     * Cloudinary's signing scheme: sort the parameters by key, join them as
     * {@code k=v&k=v}, append the API secret, then SHA-1 the result and hex-encode it.
     *
     * <p>Appending the secret rather than using it as an HMAC key is Cloudinary's design, not a
     * choice available to us — the signature has to match what their servers compute.
     */
    private String sign(Map<String, String> params) {
        String payload = params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .reduce((a, b) -> a + "&" + b)
                .orElse("");

        return sha1Hex(payload + config.apiSecret());
    }

    private static String sha1Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                // 0xff mask stops sign-extension turning 0x8a into ffffff8a, and the leading
                // zero keeps every byte two characters wide.
                hex.append(Character.forDigit((b >> 4) & 0xf, 16));
                hex.append(Character.forDigit(b & 0xf, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-1 unavailable in this JVM", ex);
        }
    }

    private void requireConfigured() {
        if (!config.isConfigured()) {
            throw new IllegalStateException(
                    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY "
                            + "and CLOUDINARY_API_SECRET.");
        }
    }
}
