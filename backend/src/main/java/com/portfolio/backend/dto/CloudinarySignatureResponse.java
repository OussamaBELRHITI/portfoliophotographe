package com.portfolio.backend.dto;

/**
 * Everything the browser needs to upload one file directly to Cloudinary — and nothing more.
 *
 * <p>Note the API <em>key</em> is here but the API <em>secret</em> is not. The key merely
 * identifies the account; the secret is what proves authority, and it never leaves the server.
 * The signature below is the proof, and it is scoped to exactly these parameters: change the
 * folder or the timestamp in the browser and Cloudinary rejects the upload.
 */
public record CloudinarySignatureResponse(
        String signature,
        long timestamp,
        String apiKey,
        String cloudName,
        String folder,
        String uploadUrl
) {
}
