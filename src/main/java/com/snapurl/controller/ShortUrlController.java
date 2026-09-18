package com.snapurl.controller;

import com.snapurl.dto.*;
import com.snapurl.service.ShortLinkService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.Map;

@RestController @RequestMapping("/api")
public class ShortUrlController {
 private final ShortLinkService service; public ShortUrlController(ShortLinkService service){this.service=service;}
 @PostMapping("/shorten") public ResponseEntity<ShortenResponse> shorten(@Valid @RequestBody ShortenRequest r){return ResponseEntity.status(201).body(service.shorten(r));}
 @PostMapping("/manage") public Map<String,Object> manage(@RequestBody ManageRequest r){return Map.of("link",service.manage(r));}
 @PostMapping("/toggle") public Map<String,Object> toggle(@RequestBody ToggleRequest r){return Map.of("link",service.toggle(r));}
 @PostMapping("/delete") public Map<String,Boolean> delete(@RequestBody ManageRequest r){service.delete(r);return Map.of("ok",true);}
 @GetMapping("/health") public Map<String,Object> health(){return Map.of("ok",true,"service","SnapURL","version","1.0.0");}
 @GetMapping("/redirect/{code}") public ResponseEntity<Void> redirect(@PathVariable String code){return ResponseEntity.status(302).location(URI.create(service.redirectTarget(code))).build();}
}
