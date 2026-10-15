import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <main className="page">
      <section className="card">
        <header>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </header>
        {children}
        <footer className="card-footer">{footer}</footer>
      </section>
    </main>
  );
}
