package com.snapurl.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/pdf-ai")
public class PdfAiController {
    private static final int MAX_CHARS = 120_000;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> analyze(@RequestBody Map<String, Object> body) {
        String action = String.valueOf(body.getOrDefault("action", ""));
        String text = body.get("text") instanceof String s ? s.trim() : "";
        String question = body.get("question") instanceof String s ? s.trim() : "";

        if (!Set.of("summarize", "intelligence", "chat").contains(action)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported action."));
        }
        if (text.isBlank() || text.length() > MAX_CHARS) {
            return ResponseEntity.badRequest().body(Map.of("error", "PDF text is required and must be 120,000 characters or less."));
        }
        if ("chat".equals(action) && question.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question is required."));
        }

        String apiKey = System.getenv("OPENAI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "OPENAI_API_KEY is not configured for the Java backend."));
        }

        String system = switch (action) {
            case "summarize" -> "You are a document summarization assistant. Summarize only the supplied document. Return an executive summary followed by 5-10 key points. Do not invent facts.";
            case "intelligence" -> "You are a document intelligence assistant. Analyze only the supplied document. Return Document type, Executive summary, Key entities/people, Dates, Amounts/numbers, Important sections, Action items, Risks or warnings, and Questions that remain. If a field is not present, say Not found. Do not invent facts.";
            default -> "You are a grounded PDF chat assistant. Answer using only the supplied PDF text. If the answer is not present, say it is not found in the PDF. Never fabricate.";
        };
        String user = "chat".equals(action) ? "PDF content:\n\n" + text + "\n\nUser question: " + question : "Analyze this document:\n\n" + text;

        try {
            String requestJson = mapper.writeValueAsString(Map.of(
                    "model", System.getenv().getOrDefault("OPENAI_MODEL", "gpt-5.6-luna"),
                    "instructions", system,
                    "input", user,
                    "max_output_tokens", "intelligence".equals(action) ? 5000 : 4000
            ));
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());
            if (response.statusCode() >= 400) {
                String message = root.path("error").path("message").asText("AI provider request failed.");
                return ResponseEntity.status(502).body(Map.of("error", message));
            }
            String result = extractText(root);
            if (result.isBlank()) return ResponseEntity.status(502).body(Map.of("error", "AI returned an empty response."));
            return ResponseEntity.ok(Map.of("result", result));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "AI request failed: " + e.getMessage()));
        }
    }

    private String extractText(JsonNode root) {
        if (root.hasNonNull("output_text")) return root.path("output_text").asText();
        StringBuilder out = new StringBuilder();
        for (JsonNode item : root.path("output")) {
            for (JsonNode content : item.path("content")) {
                if ("output_text".equals(content.path("type").asText())) {
                    if (out.length() > 0) out.append('\n');
                    out.append(content.path("text").asText());
                }
            }
        }
        return out.toString();
    }
}