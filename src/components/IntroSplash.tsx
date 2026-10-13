import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { BRAND } from '../constants/config';

type Props = {
  onFinish: () => void;
};

type Particle = {
  id: number;
  color: string;
  delayMs: number;
  startX: number;
  startY: number;
  curveFactor: number;
};

const PARTICLE_SIZE = 10; // Plus petit pour faire "poussière d'étoile"
const LOGO_SIZE = 160;
const FORMATION_DURATION = 4000; // Ralenti pour profiter du spectacle
const LOGO_HOLD_DURATION = 3000;
const PARTICLES_TOTAL = 100; // Plus de particules pour un effet dense

function ParticleEffect({
  color,
  delayMs,
  endX,
  endY,
  startX,
  startY,
  curveFactor,
}: Particle & { endX: number; endY: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      // On ralentit la courbe d'arrivée
      withTiming(1, {
        duration: FORMATION_DURATION - 800,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      })
    );
  }, [delayMs, progress]);

  const style = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0, 0.6, 1], [startX, (startX + endX) / 2 + curveFactor, endX]);
    const y = interpolate(progress.value, [0, 0.6, 1], [startY, (startY + endY) / 2 - curveFactor, endY]);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 1.2, 0.8, 0]) },
      ],
      opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 0.8, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: PARTICLE_SIZE,
          height: PARTICLE_SIZE,
          borderRadius: PARTICLE_SIZE / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function IntroSplash({ onFinish }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const centerX = W / 2 - PARTICLE_SIZE / 2;
  const centerY = H / 2 - PARTICLE_SIZE / 2;

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const bgOverlayOpacity = useSharedValue(0);

  const particlesData = useMemo(() => {
    const data: Particle[] = [];
    const colors = [BRAND.green, BRAND.orange, '#80ED99', '#FFB703'];
    
    for (let i = 0; i < PARTICLES_TOTAL; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spawnRadius = Math.max(W, H);
      
      data.push({
        id: i,
        color: colors[i % colors.length],
        delayMs: Math.random() * 1200, // Staggering plus long
        startX: centerX + Math.cos(angle) * spawnRadius,
        startY: centerY + Math.sin(angle) * spawnRadius,
        curveFactor: (Math.random() - 0.5) * 400,
      });
    }
    return data;
  }, [W, H, centerX, centerY]);

  useEffect(() => {
    // Apparition du logo beaucoup plus douce et lente
    const showLogo = setTimeout(() => {
      bgOverlayOpacity.value = withTiming(1, { duration: 1500 });
      logoOpacity.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) });
      logoScale.value = withSpring(1, { damping: 12, stiffness: 60 });
    }, FORMATION_DURATION - 1200);

    const showTitle = setTimeout(() => {
      titleOpacity.value = withTiming(1, { duration: 1000 });
      titleY.value = withSpring(0);
    }, FORMATION_DURATION - 200);

    const done = setTimeout(() => {
      onFinish();
    }, FORMATION_DURATION + LOGO_HOLD_DURATION);

    return () => {
      clearTimeout(showLogo);
      clearTimeout(showTitle);
      clearTimeout(done);
    };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.bg} />
      <Animated.View style={[styles.bgOverlay, { opacity: bgOverlayOpacity }]} />

      {/* Particules Vortex */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particlesData.map((p) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 40; // Se concentrent dans un petit point central
          return <ParticleEffect key={p.id} {...p} endX={centerX + Math.cos(angle) * dist} endY={centerY + Math.sin(angle) * dist} />;
        })}
      </View>

      {/* Contenu avec effet de fusion sans "carré" */}
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image
            source={require('../../assets/images/LogoSmartVisionbrain.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.titleContainer, titleStyle]}>
          <Text style={styles.titleTextMain}>
            <Text style={{ color: BRAND.green }}>Smart</Text>
            <Text style={{ color: BRAND.orange, fontWeight: '300' }}>Vision</Text>
          </Text>
          <View style={styles.underline} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  titleTextMain: {
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -1,
    fontFamily: 'System', // Ou ta police personnalisée
  },
  underline: {
    height: 3,
    width: 40,
    backgroundColor: BRAND.green,
    marginTop: 5,
    borderRadius: 2,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});