package com.snapurl.dto;

import jakarta.validation.constraints.*;

public record ShortenRequest(
    @NotBlank(message="URL is required") @Size(max=4096) String url,
    @Pattern(regexp="^$|[A-Za-z0-9_-]{4,32}$", message="Alias must be 4–32 letters, numbers, - or _") String alias,
    @Size(max=120) String title,
    @Min(value=1, message="Expiry must be at least 1 day") @Max(value=365, message="Expiry cannot exceed 365 days") Integer expiresInDays
) {}
