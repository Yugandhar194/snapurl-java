package com.snapurl.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(NotFoundException.class) ResponseEntity<?> notFound(NotFoundException e){return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(ConflictException.class) ResponseEntity<?> conflict(ConflictException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> bad(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e){String m=e.getBindingResult().getFieldErrors().stream().findFirst().map(x->x.getDefaultMessage()).orElse("Invalid request");return ResponseEntity.badRequest().body(Map.of("error",m));}
}
