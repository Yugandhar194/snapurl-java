package com.snapurl.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/qr-upload")
public class QrPdfController {
    private static final long MAX_BYTES = 15L * 1024 * 1024;
    private final Path uploadDir = Path.of("data", "qr-pdfs");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "PDF file is required"));
        }
        if (!MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(file.getContentType())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only PDF files are supported"));
        }
        if (file.getSize() > MAX_BYTES) {
            return ResponseEntity.status(413).body(Map.of("error", "PDF must be 15 MB or smaller"));
        }

        Files.createDirectories(uploadDir);
        String name = UUID.randomUUID() + ".pdf";
        Files.copy(file.getInputStream(), uploadDir.resolve(name));

        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/qr-pdfs/")
                .path(name)
                .toUriString();

        return ResponseEntity.ok(Map.of("url", url));
    }
}