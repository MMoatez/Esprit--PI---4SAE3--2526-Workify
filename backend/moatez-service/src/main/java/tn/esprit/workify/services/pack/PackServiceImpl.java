package tn.esprit.workify.services.pack;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.workify.DTO.CreatePackDto;
import tn.esprit.workify.DTO.PackOptionDto;
import tn.esprit.workify.entities.pack.Feature;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.PackOption;
import tn.esprit.workify.entities.pack.UserType;
import tn.esprit.workify.repositories.PackRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackServiceImpl implements IPackService {

    private final PackRepository packRepository;

    @Override
    @Transactional
    public Pack createPack(CreatePackDto dto) {

        validatePackDto(dto);

        List<PackOptionDto> optionDtos = resolveOptionDtos(dto);
        validatePackOptions(optionDtos);

        Pack pack = Pack.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .userType(dto.getUserType())
                .build();

        pack.setOptions(mapOptions(optionDtos, pack));
        syncLegacyFieldsFromOptions(pack);


        if (dto.getFeatures() != null && !dto.getFeatures().isEmpty()) {
            List<Feature> features = dto.getFeatures().stream()
                    .map(featureText -> {
                        Feature feature = Feature.builder()
                                .text(featureText)
                                .pack(pack)
                                .build();
                        return feature;
                    })
                    .collect(Collectors.toList());
            pack.setFeatures(features);
        }

        Pack saved = packRepository.save(pack);
        return enrichLegacyFields(saved);
    }

    @Override
    public List<Pack> getAllPacks() {
        return packRepository.findAll().stream()
                .map(this::enrichLegacyFields)
                .collect(Collectors.toList());
    }

    @Override
    public Pack getPackById(Integer id) {
        Pack pack = packRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pack not found with id: " + id));
        return enrichLegacyFields(pack);
    }

    @Override
    public List<Pack> getPacksByUserType(UserType userType) {
        return packRepository.findByUserType(userType).stream()
                .map(this::enrichLegacyFields)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Pack updatePack(Integer id, CreatePackDto dto) {
        Pack existing = getPackById(id);

        validatePackDto(dto);

        List<PackOptionDto> optionDtos = resolveOptionDtos(dto);
        validatePackOptions(optionDtos);


        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setUserType(dto.getUserType());

        // Force-delete previous options first to avoid unique constraint collisions
        // on (pack_id, duration) during the same transaction.
        existing.getOptions().clear();
        packRepository.saveAndFlush(existing);
        existing.getOptions().addAll(mapOptions(optionDtos, existing));
        syncLegacyFieldsFromOptions(existing);


        if (dto.getFeatures() != null) {

            existing.getFeatures().clear();


            List<Feature> newFeatures = dto.getFeatures().stream()
                    .map(featureText -> Feature.builder()
                            .text(featureText)
                            .pack(existing) //
                            .build())
                    .collect(Collectors.toList());
            existing.getFeatures().addAll(newFeatures);
        }

        Pack saved = packRepository.save(existing);
        return enrichLegacyFields(saved);
    }

    private List<PackOptionDto> resolveOptionDtos(CreatePackDto dto) {
        if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
            return dto.getOptions();
        }

        if (dto.getPrice() != null && dto.getDuration() != null) {
            PackOptionDto legacyOption = new PackOptionDto();
            legacyOption.setDuration(dto.getDuration());
            legacyOption.setPrice(dto.getPrice());
            legacyOption.setActive(true);
            return List.of(legacyOption);
        }

        return List.of();
    }

    private Pack enrichLegacyFields(Pack pack) {
        if (pack == null) {
            return null;
        }

        PackOption source = null;
        if (pack.getOptions() != null && !pack.getOptions().isEmpty()) {
            source = pack.getOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getActive()))
                    .findFirst()
                    .orElse(pack.getOptions().get(0));
        }

        if (source != null) {
            pack.setPrice(source.getPrice());
            pack.setDuration(source.getDuration());
        }

        return pack;
    }

    private void syncLegacyFieldsFromOptions(Pack pack) {
        if (pack == null || pack.getOptions() == null || pack.getOptions().isEmpty()) {
            return;
        }

        PackOption source = pack.getOptions().stream()
                .filter(o -> Boolean.TRUE.equals(o.getActive()))
                .findFirst()
                .orElse(pack.getOptions().get(0));

        pack.setPrice(source.getPrice());
        pack.setDuration(source.getDuration());
    }

    private List<PackOption> mapOptions(List<PackOptionDto> optionDtos, Pack pack) {
        return optionDtos.stream()
                .map(optionDto -> PackOption.builder()
                        .duration(optionDto.getDuration())
                        .price(optionDto.getPrice())
                        .active(Boolean.TRUE.equals(optionDto.getActive()))
                        .pack(pack)
                        .build())
                .collect(Collectors.toList());
    }

    private void validatePackOptions(List<PackOptionDto> optionDtos) {
        if (optionDtos == null || optionDtos.isEmpty()) {
            throw new RuntimeException("Pack options or legacy price/duration are required");
        }

        boolean hasActive = optionDtos.stream().anyMatch(option -> Boolean.TRUE.equals(option.getActive()));
        if (!hasActive) {
            throw new RuntimeException("At least one pack option must be active");
        }

        Set<Object> seenDurations = new HashSet<>();
        for (PackOptionDto option : optionDtos) {
            if (option.getDuration() == null) {
                throw new RuntimeException("Pack option duration is required");
            }
            if (!seenDurations.add(option.getDuration())) {
                throw new RuntimeException("Duplicate duration in pack options: " + option.getDuration());
            }
            if (option.getPrice() == null || option.getPrice() < 0) {
                throw new RuntimeException("Pack option price must be a positive value");
            }
            if (Objects.isNull(option.getActive())) {
                throw new RuntimeException("Pack option active flag is required");
            }
        }
    }

    private void validatePackDto(CreatePackDto dto) {
        if (dto == null) {
            throw new RuntimeException("Pack payload is required");
        }
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new RuntimeException("Pack name is required");
        }
        if (dto.getDescription() == null || dto.getDescription().trim().isEmpty()) {
            throw new RuntimeException("Pack description is required");
        }
        if (dto.getUserType() == null) {
            throw new RuntimeException("Pack user type is required");
        }

        // Legacy compatibility: when using price/duration fallback, both are required together.
        if ((dto.getPrice() == null) != (dto.getDuration() == null)) {
            throw new RuntimeException("Legacy fields price and duration must be provided together");
        }
    }

    @Override
    @Transactional
    public void deletePack(Integer id) {
        if (!packRepository.existsById(id)) {
            throw new RuntimeException("Pack not found with id: " + id);
        }
        packRepository.deleteById(id);
    }
}