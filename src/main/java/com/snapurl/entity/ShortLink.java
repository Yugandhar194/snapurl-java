package com.snapurl.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "short_links", indexes = @Index(name = "idx_short_links_code", columnList = "code", unique = true))
public class ShortLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, unique = true, length = 32) private String code;
    @Column(name = "destination_url", nullable = false, length = 4096) private String destinationUrl;
    @Column(length = 120) private String title;
    @Column(name = "manage_token_hash", nullable = false, length = 64) private String manageTokenHash;
    @Column(name = "click_count", nullable = false) private long clickCount = 0;
    @Column(name = "last_clicked_at") private OffsetDateTime lastClickedAt;
    @Column(name = "expires_at") private OffsetDateTime expiresAt;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;

    @PrePersist void prePersist() { if (createdAt == null) createdAt = OffsetDateTime.now(); }
    public UUID getId(){return id;} public String getCode(){return code;} public void setCode(String v){code=v;}
    public String getDestinationUrl(){return destinationUrl;} public void setDestinationUrl(String v){destinationUrl=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getManageTokenHash(){return manageTokenHash;} public void setManageTokenHash(String v){manageTokenHash=v;}
    public long getClickCount(){return clickCount;} public void setClickCount(long v){clickCount=v;}
    public OffsetDateTime getLastClickedAt(){return lastClickedAt;} public void setLastClickedAt(OffsetDateTime v){lastClickedAt=v;}
    public OffsetDateTime getExpiresAt(){return expiresAt;} public void setExpiresAt(OffsetDateTime v){expiresAt=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public OffsetDateTime getCreatedAt(){return createdAt;}
}
