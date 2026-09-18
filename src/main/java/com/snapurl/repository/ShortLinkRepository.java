package com.snapurl.repository;

import com.snapurl.entity.ShortLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface ShortLinkRepository extends JpaRepository<ShortLink, UUID> {
    Optional<ShortLink> findByCode(String code);
    Optional<ShortLink> findByCodeAndManageTokenHash(String code, String hash);
    @Modifying @Query("update ShortLink s set s.clickCount = s.clickCount + 1, s.lastClickedAt = CURRENT_TIMESTAMP where s.code = :code and s.active = true")
    int incrementClick(@Param("code") String code);
}
