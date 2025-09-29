import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Cylinder, Cone, Torus } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
  color?: string;
  style?: 'robot' | 'character' | 'abstract';
  animationSpeed?: number;
  size?: number;
  interactive?: boolean;
}

// Robot Avatar Component
function RobotAvatar({ color = '#4F46E5' }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Idle animation
    groupRef.current.rotation.y += 0.005;
    
    // Hover effect
    if (hovered) {
      groupRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.1);
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
    
    // Floating animation
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  
  return (
    <group 
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Head */}
      <Box args={[0.8, 0.8, 0.8]} position={[0, 1.2, 0]}>
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </Box>
      
      {/* Eyes */}
      <Sphere args={[0.1]} position={[-0.2, 1.3, 0.4]}>
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
      </Sphere>
      <Sphere args={[0.1]} position={[0.2, 1.3, 0.4]}>
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
      </Sphere>
      
      {/* Antenna */}
      <Cylinder args={[0.02, 0.02, 0.4]} position={[0, 1.8, 0]}>
        <meshStandardMaterial color={color} metalness={1} roughness={0} />
      </Cylinder>
      <Sphere args={[0.08]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
      </Sphere>
      
      {/* Body */}
      <Box args={[1, 1.2, 0.6]} position={[0, 0, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </Box>
      
      {/* Arms */}
      <Cylinder args={[0.1, 0.1, 0.8]} position={[-0.7, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.8]} position={[0.7, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
      
      {/* Legs */}
      <Cylinder args={[0.15, 0.15, 0.8]} position={[-0.3, -1, 0]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.15, 0.15, 0.8]} position={[0.3, -1, 0]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </Cylinder>
    </group>
  );
}

// Character Avatar Component
function CharacterAvatar({ color = '#10B981' }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [jumping, setJumping] = useState(false);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Breathing animation
    const breathingScale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
    groupRef.current.scale.x = breathingScale;
    groupRef.current.scale.z = breathingScale;
    
    // Jump animation
    if (jumping) {
      groupRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.5;
    } else {
      groupRef.current.position.y = 0;
    }
  });
  
  return (
    <group 
      ref={groupRef}
      onClick={() => setJumping(!jumping)}
    >
      {/* Head */}
      <Sphere args={[0.5]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
      
      {/* Eyes */}
      <Sphere args={[0.08]} position={[-0.15, 1.55, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
      <Sphere args={[0.08]} position={[0.15, 1.55, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
      
      {/* Smile */}
      <Torus args={[0.15, 0.03, 8, 20, Math.PI]} position={[0, 1.35, 0.4]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#000000" />
      </Torus>
      
      {/* Body */}
      <Sphere args={[0.7, 16, 16]} position={[0, 0.3, 0]} scale={[1, 1.3, 1]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
      
      {/* Arms */}
      <Sphere args={[0.2, 8, 8]} position={[-0.8, 0.5, 0]} scale={[1.5, 1, 1]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
      <Sphere args={[0.2, 8, 8]} position={[0.8, 0.5, 0]} scale={[1.5, 1, 1]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
      
      {/* Feet */}
      <Sphere args={[0.25, 8, 8]} position={[-0.3, -0.8, 0]} scale={[1, 0.8, 1.5]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
      <Sphere args={[0.25, 8, 8]} position={[0.3, -0.8, 0]} scale={[1, 0.8, 1.5]}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </Sphere>
    </group>
  );
}

// Abstract Avatar Component
function AbstractAvatar({ color = '#EC4899' }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [pulse, setPulse] = useState(false);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Rotation animation
    groupRef.current.rotation.x += 0.01;
    groupRef.current.rotation.y += 0.01;
    
    // Pulse effect
    if (pulse) {
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
      groupRef.current.scale.setScalar(pulseScale);
    }
  });
  
  return (
    <group 
      ref={groupRef}
      onPointerEnter={() => setPulse(true)}
      onPointerLeave={() => setPulse(false)}
    >
      {/* Core */}
      <Sphere args={[0.5]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          metalness={0.9} 
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </Sphere>
      
      {/* Orbiting elements */}
      <Torus args={[0.8, 0.1, 16, 50]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          metalness={1} 
          roughness={0}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Torus>
      
      <Torus args={[1, 0.08, 16, 50]} rotation={[0, Math.PI / 2, Math.PI / 4]}>
        <meshStandardMaterial 
          color={color} 
          metalness={1} 
          roughness={0}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Torus>
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 1.2;
        const z = Math.sin(angle) * 1.2;
        
        return (
          <Sphere key={i} args={[0.1]} position={[x, 0, z]}>
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={1}
            />
          </Sphere>
        );
      })}
    </group>
  );
}

export function Avatar3D({ 
  color = '#4F46E5',
  style = 'robot',
  animationSpeed = 1,
  size = 200,
  interactive = true
}: Avatar3DProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div 
        style={{ width: size, height: size }}
        className="bg-muted rounded-lg animate-pulse"
      />
    );
  }
  
  return (
    <div style={{ width: size, height: size }} className="rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
        
        {style === 'robot' && <RobotAvatar color={color} />}
        {style === 'character' && <CharacterAvatar color={color} />}
        {style === 'abstract' && <AbstractAvatar color={color} />}
        
        {interactive && <OrbitControls enableZoom={false} enablePan={false} />}
      </Canvas>
    </div>
  );
}