package com.snapurl.service;

import com.snapurl.dto.*;
import com.snapurl.entity.ShortLink;
import com.snapurl.exception.*;
import com.snapurl.repository.ShortLinkRepository;
import com.snapurl.strategy.ShortCodeStrategy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;

@Service
public class ShortLinkService {
    private final ShortLinkRepository repository; private final ShortCodeStrategy codeStrategy;
    public ShortLinkService(ShortLinkRepository repository, ShortCodeStrategy codeStrategy){this.repository=repository;this.codeStrategy=codeStrategy;}
    @Transactional public ShortenResponse shorten(ShortenRequest req){
        String url=normalizeUrl(req.url()); String alias=req.alias()==null?"":req.alias().trim();
        if(!alias.isEmpty() && isReserved(alias)) throw new ConflictException("That alias is reserved. Try another one.");
        OffsetDateTime expiry=req.expiresInDays()==null?null:OffsetDateTime.now().plusDays(req.expiresInDays());
        String token=java.util.UUID.randomUUID().toString().replace("-","")+java.util.UUID.randomUUID().toString().replace("-","");
        String hash=sha256(token);
        for(int i=0;i<8;i++){
            String code=alias.isEmpty()?codeStrategy.generate():alias;
            try{ShortLink l=new ShortLink();l.setCode(code);l.setDestinationUrl(url);l.setTitle(cleanTitle(req.title()));l.setManageTokenHash(hash);l.setExpiresAt(expiry);return ShortenResponse.of(repository.save(l),token);}
            catch(DataIntegrityViolationException e){if(!alias.isEmpty())throw new ConflictException("That alias is already taken. Try another one.");}
        }
        throw new IllegalStateException("Could not generate a unique short code. Please try again.");
    }
    @Transactional(readOnly=true) public ShortLinkResponse manage(ManageRequest r){return ShortLinkResponse.of(auth(r));}
    @Transactional public ShortLinkResponse toggle(ToggleRequest r){ShortLink l=auth(new ManageRequest(r.code(),r.token()));l.setActive(r.active());return ShortLinkResponse.of(repository.save(l));}
    @Transactional public void delete(ManageRequest r){repository.delete(auth(r));}
    @Transactional public String redirectTarget(String code){ShortLink l=repository.findByCode(code).orElseThrow(()->new NotFoundException("Link not found"));if(!l.isActive())throw new NotFoundException("Link disabled");if(l.getExpiresAt()!=null&&l.getExpiresAt().isBefore(OffsetDateTime.now()))throw new NotFoundException("Link expired");repository.incrementClick(code);return l.getDestinationUrl();}
    private ShortLink auth(ManageRequest r){if(r==null||r.code()==null||r.token()==null)throw new IllegalArgumentException("Code and management token are required.");return repository.findByCodeAndManageTokenHash(r.code().trim(),sha256(r.token().trim())).orElseThrow(()->new NotFoundException("Link not found or management token is invalid."));}
    private String normalizeUrl(String raw){try{URI u=URI.create(raw.trim());if(!"http".equalsIgnoreCase(u.getScheme())&&!"https".equalsIgnoreCase(u.getScheme()))throw new Exception();if(u.getHost()==null)throw new Exception();return u.toString();}catch(Exception e){throw new IllegalArgumentException("Enter a valid http:// or https:// URL.");}}
    private String cleanTitle(String s){if(s==null)return null;String t=s.trim().replace("<","").replace(">","");return t.isEmpty()?null:t.substring(0,Math.min(120,t.length()));}
    private boolean isReserved(String c){return java.util.Set.of("api","about","admin","app","assets","favicon","health","login","privacy","robots","s","shorten","status","terms","theme").contains(c.toLowerCase());}
    private String sha256(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
