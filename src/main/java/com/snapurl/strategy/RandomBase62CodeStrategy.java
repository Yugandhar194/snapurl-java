package com.snapurl.strategy;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;

@Component
public class RandomBase62CodeStrategy implements ShortCodeStrategy {
    private static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private final SecureRandom random = new SecureRandom();
    @Override public String generate() {
        StringBuilder b = new StringBuilder(7);
        for (int i=0;i<7;i++) b.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        return b.toString();
    }
}
