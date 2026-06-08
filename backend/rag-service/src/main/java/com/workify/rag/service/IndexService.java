package com.workify.rag.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class IndexService {

    @Value("${rag.index.file:rag-index.json}")
    private String indexFilePath;

    @Autowired
    private EmbedderService embedderService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Structure: liste de chunks avec leur embedding
    private final List<IndexEntry> index = new CopyOnWriteArrayList<>();

    // ── INIT ──────────────────────────────────────────────────────
    @PostConstruct
    public void loadIndex() {
        File file = new File(indexFilePath);
        if (file.exists()) {
            try {
                List<IndexEntry> loaded = objectMapper.readValue(
                    file, new TypeReference<List<IndexEntry>>() {}
                );
                index.addAll(loaded);
                log.info("✅ RAG Index loaded: {} chunks from {}", index.size(), indexFilePath);
            } catch (IOException e) {
                log.warn("⚠️ Could not load index file: {} — starting fresh", e.getMessage());
            }
        } else {
            log.info("📂 No existing index file — starting fresh");
        }
    }

    // ── STORE ─────────────────────────────────────────────────────
    /**
     * Ajoute un chunk au vector store
     * @param sourceType  MESSAGE | PROJECT | OFFER | MILESTONE
     * @param sourceId    ID de la source
     * @param content     texte à indexer
     * @param metadata    infos supplémentaires (role visibility, etc.)
     */
    public void store(String sourceType, String sourceId, String content, Map<String, String> metadata) {
        if (content == null || content.isBlank()) return;

        float[] embedding = embedderService.embed(content);

        // Supprimer ancien chunk si même source
        index.removeIf(e -> sourceType.equals(e.getSourceType())
                         && sourceId.equals(e.getSourceId()));

        IndexEntry entry = new IndexEntry();
        entry.setId(UUID.randomUUID().toString());
        entry.setSourceType(sourceType);
        entry.setSourceId(sourceId);
        entry.setContent(content);
        entry.setEmbedding(embedding);
        entry.setMetadata(metadata != null ? metadata : new HashMap<>());
        entry.setCreatedAt(System.currentTimeMillis());

        index.add(entry);
        persistIndex();

        log.debug("✅ Indexed chunk: [{}:{}] — {} chars", sourceType, sourceId, content.length());
    }

    // ── SEARCH ────────────────────────────────────────────────────
    /**
     * Recherche les K chunks les plus similaires
     * @param query      texte de recherche
     * @param topK       nombre de résultats
     * @param userRole   pour filtrer la visibilité
     */
    public List<String> search(String query, int topK, String userRole) {
        if (index.isEmpty()) {
            log.warn("⚠️ RAG index is empty");
            return List.of();
        }

        float[] queryEmbedding = embedderService.embed(query);

        return index.stream()
            .filter(e -> isVisibleFor(e, userRole))
            .map(e -> new AbstractMap.SimpleEntry<>(
                e.getContent(),
                embedderService.cosineSimilarity(queryEmbedding, e.getEmbedding())
            ))
            .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
            .limit(topK)
            .filter(e -> e.getValue() > 0.1) // seuil minimum similarité (abaissé pour tests)
            .map(Map.Entry::getKey)
            .toList();
    }

    // ── VISIBILITY FILTER ─────────────────────────────────────────
    private boolean isVisibleFor(IndexEntry entry, String userRole) {
        if (userRole == null || "ADMIN".equals(userRole)) return true;
        String visibility = entry.getMetadata().getOrDefault("visibility", "ALL");
        return switch (visibility) {
            case "ALL"             -> true;
            case "FREELANCER_ONLY" -> "FREELANCER".equals(userRole);
            case "CLIENT_ONLY"     -> "CLIENT".equals(userRole);
            case "ADMIN_ONLY"      -> "ADMIN".equals(userRole);
            default                -> true;
        };
    }

    // ── PERSIST ───────────────────────────────────────────────────
    private synchronized void persistIndex() {
        try {
            objectMapper.writeValue(new File(indexFilePath), index);
        } catch (IOException e) {
            log.error("❌ Failed to persist RAG index: {}", e.getMessage());
        }
    }

    public int size() { return index.size(); }
    public void clear() { index.clear(); persistIndex(); }

    // ── INNER CLASS ───────────────────────────────────────────────
    public static class IndexEntry {
        private String id;
        private String sourceType;
        private String sourceId;
        private String content;
        private float[] embedding;
        private Map<String, String> metadata;
        private long createdAt;

        // Getters & Setters
        public String getId()                          { return id; }
        public void setId(String id)                   { this.id = id; }
        public String getSourceType()                  { return sourceType; }
        public void setSourceType(String sourceType)   { this.sourceType = sourceType; }
        public String getSourceId()                    { return sourceId; }
        public void setSourceId(String sourceId)       { this.sourceId = sourceId; }
        public String getContent()                     { return content; }
        public void setContent(String content)         { this.content = content; }
        public float[] getEmbedding()                  { return embedding; }
        public void setEmbedding(float[] embedding)    { this.embedding = embedding; }
        public Map<String, String> getMetadata()       { return metadata; }
        public void setMetadata(Map<String, String> m) { this.metadata = m; }
        public long getCreatedAt()                     { return createdAt; }
        public void setCreatedAt(long createdAt)       { this.createdAt = createdAt; }
    }
}