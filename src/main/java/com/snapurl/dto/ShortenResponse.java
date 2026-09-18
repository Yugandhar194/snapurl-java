package com.snapurl.dto;

import com.snapurl.entity.ShortLink;

public record ShortenResponse(ShortLinkResponse link, String manageToken) {
    public static ShortenResponse of(ShortLink l, String token){return new ShortenResponse(ShortLinkResponse.of(l), token);}
}
