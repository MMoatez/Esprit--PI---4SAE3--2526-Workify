package tn.esprit.workify.configs;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

/**
 * Intercepteur du canal STOMP entrant.
 *
 * Lors du frame CONNECT, lit le header "login" (= userId envoyé par Angular)
 * et l'associe comme Principal de la session STOMP.
 *
 * Sans cela, convertAndSendToUser("3", ...) ne trouve aucune session et
 * les messages sont silencieusement ignorés.
 */
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String login = accessor.getLogin();

            if (login != null && !login.isBlank()) {
                StompPrincipal principal = new StompPrincipal(login);
                accessor.setUser(principal);
                log.info("[STOMP] ✅ Session authentifiée — userId={}", login);
            } else {
                log.warn("[STOMP] ⚠️ Frame CONNECT reçu sans header 'login' — les notifications ciblées ne fonctionneront pas.");
            }
        }

        return message;
    }
}
