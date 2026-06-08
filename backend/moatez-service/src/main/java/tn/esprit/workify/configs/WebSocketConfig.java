package tn.esprit.workify.configs;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    /**
     * Enregistre l'intercepteur qui lit le header "login" du frame CONNECT
     * et associe l'userId comme Principal de la session STOMP.

     * On configure également un TaskExecutor dédié avec
     * waitForTasksToCompleteOnShutdown = true pour éviter la
     * RejectedExecutionException lors de l'arrêt de l'application
     * (le pool de threads était terminé avant que le SubProtocolWebSocketHandler
     * n'ait envoyé le frame DISCONNECT).
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("ws-inbound-");
        // Attendre la fin des tâches en cours avant l'arrêt complet
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        executor.initialize();

        registration.taskExecutor(executor);
        registration.interceptors(new StompAuthChannelInterceptor());
    }
}


