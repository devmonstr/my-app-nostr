'use client';

import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function About() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="bg-card-bg p-8 rounded-xl shadow-xl w-full max-w-2xl transform transition-all">
            <h1 className="text-4xl font-extrabold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">
              About Monstr
            </h1>
            <div className="space-y-6 text-foreground/90">
              <p className="text-lg leading-relaxed">
                Welcome to <span className="font-semibold text-primary">Monstr</span>, a cutting-edge platform designed to seamlessly manage your Nostr identities with ease and precision. What makes this project truly unique is its origin story — every single line of code, design decision, and feature implementation has been crafted entirely through the power of artificial intelligence.
              </p>
              <p className="text-lg leading-relaxed">
                This website was developed 100% using <span className="font-semibold text-secondary">AI</span>. AI's ability to understand complex requirements, generate robust code, and refine user experiences has enabled us to build a platform that is not only functional but also elegant and user-centric.
              </p>
              <p className="text-lg leading-relaxed">
                By leveraging AI's innovative capabilities, we’ve pushed the boundaries of what’s possible in web development, creating a tool that empowers the Nostr community while showcasing the transformative potential of AI-driven development. Our mission is to provide a reliable, intuitive, and secure service for managing your Nostr addresses — all while demonstrating the future of technology through AI.
              </p>
              <p className="text-lg leading-relaxed text-center">
                Join us on this journey and experience the magic of a platform born from the synergy of human creativity and artificial intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}