package com.workify.projectservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {

        // Broker simple en mémoire
        registry.enableSimpleBroker("/topic", "/queue");

        // Prefix pour @MessageMapping
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix pour destinations privées
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        // ✅ Endpoint WebSocket PUR
        registry.addEndpoint("/ws-notifications")
                .setAllowedOriginPatterns("*");

        // ✅ Endpoint SockJS (Angular)
        registry.addEndpoint("/ws-notifications-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}