package com.workify.projectservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class EmbeddingService {

    private final ObjectMapper mapper = new ObjectMapper();

    // 🔥 VERSION SAFE (Mock embedding)
    public double[] generateEmbedding(String text) {

        try {
            // Simule un embedding stable
            Random random = new Random(text.hashCode());

            double[] vector = new double[128];

            for (int i = 0; i < vector.length; i++) {
                vector[i] = random.nextDouble();
            }

            return vector;

        } catch (Exception e) {
            e.printStackTrace();
            // 🔥 ne jamais casser la création
            return new double[128];
        }
    }

    public String toJson(double[] vector) {
        try {
            return mapper.writeValueAsString(vector);
        } catch (Exception e) {
            return "[]";
        }
    }

    public double[] fromJson(String json) {
        try {
            if (json == null || json.isEmpty()) {
                return new double[128];
            }
            return mapper.readValue(json, double[].class);
        } catch (Exception e) {
            return new double[128];
        }
    }
}