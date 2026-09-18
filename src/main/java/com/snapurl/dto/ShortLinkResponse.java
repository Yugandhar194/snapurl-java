package com.snapurl.dto;

import com.snapurl.entity.ShortLink;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ShortLinkResponse(UUID id,String code,String destinationUrl,String title,long clickCount,OffsetDateTime lastClickedAt,OffsetDateTime expiresAt,boolean active,OffsetDateTime createdAt){
    public static ShortLinkResponse of(ShortLink l){return new ShortLinkResponse(l.getId(),l.getCode(),l.getDestinationUrl(),l.getTitle(),l.getClickCount(),l.getLastClickedAt(),l.getExpiresAt(),l.isActive(),l.getCreatedAt());}
}
