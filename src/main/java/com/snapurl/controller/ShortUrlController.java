package com.snapurl.controller;

import com.snapurl.dto.*;
import com.snapurl.service.ShortLinkService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping
public class ShortUrlController {
    private final ShortLinkService service;

    public ShortUrlController(ShortLinkService service) {
        this.service = service;
    }

    @PostMapping("/api/shorten")
    public ResponseEntity<ShortenResponse> shorten(@Valid @RequestBody ShortenRequest r) {
        return ResponseEntity.status(201).body(service.shorten(r));
    }

    @PostMapping("/api/manage")
    public Map<String, Object> manage(@RequestBody ManageRequest r) {
        return Map.of("link", service.manage(r));
    }

    @PostMapping("/api/toggle")
    public Map<String, Object> toggle(@RequestBody ToggleRequest r) {
        return Map.of("link", service.toggle(r));
    }

    @PostMapping("/api/delete")
    public Map<String, Boolean> delete(@RequestBody ManageRequest r) {
        service.delete(r);
        return Map.of("ok", true);
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "service", "SnapURL", "version", "1.0.0");
    }

    /**
     * Browser-friendly short URL used by the frontend: /s/{code}
     */
    @GetMapping("/s/{code}")
    public ResponseEntity<Void> shortLink(@PathVariable String code) {
        return redirect(code);
    }

    /**
     * API-compatible redirect endpoint for programmatic clients.
     */
    @GetMapping("/api/redirect/{code}")
    public ResponseEntity<Void> redirect(@PathVariable String code) {
        return ResponseEntity.status(302)
                .location(URI.create(service.redirectTarget(code)))
                .build();
    }
}
