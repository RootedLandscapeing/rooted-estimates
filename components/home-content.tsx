"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAppData } from "@/lib/storage";
import { SiteContent } from "@/lib/types";
import { defaultData } from "@/lib/mock-data";

export function HomeContent() {
  const [content, setContent] = useState<SiteContent>(defaultData.siteContent);

  useEffect(() => {
    setContent(loadAppData().siteContent);
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy hero-main">
          <div className="brand-lockup">
            <Image
              src="/rooted-logo.png"
              alt="Rooted Moapa Valley Landscaping logo"
              width={420}
              height={236}
              className="brand-logo"
              priority
            />
          </div>
          <p className="eyebrow">{content.businessName}</p>
          <h1>{content.heroTitle}</h1>
          <p className="hero-text">{content.heroDescription}</p>
          <p className="service-area">{content.serviceArea}</p>
        </div>

        <div className="hero-card hero-summary-card">
          <div className="summary-head">
            <p className="eyebrow">How It Works</p>
            <h2>Simple estimate scheduling for local landscaping jobs.</h2>
          </div>
          <div className="summary-steps">
            <Link href="/request-estimate" className="summary-step summary-step-link">
              <span className="step-number">1</span>
              <div>
                <strong>Request an estimate</strong>
                <p>Tell Rooted about the project, share photos if needed, and choose a time.</p>
              </div>
              <span className="summary-step-cta">{content.primaryCtaLabel}</span>
            </Link>
            <article className="summary-step">
              <span className="step-number">2</span>
              <div>
                <strong>Review the quote</strong>
                <p>Look over the scope of work, pricing, and any deposit details before moving ahead.</p>
              </div>
            </article>
            <article className="summary-step">
              <span className="step-number">3</span>
              <div>
                <strong>Get scheduled</strong>
                <p>Approve the work and Rooted will confirm the schedule and next steps with you.</p>
              </div>
            </article>
          </div>
          <div className="summary-services">
            {content.services.map((service) => (
              <span key={service} className="service-chip">
                {service}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="about-panel section-surface">
          <h2>{content.aboutTitle}</h2>
          <p className="hero-card-copy">{content.aboutDescription}</p>
        </div>
        <div className="cta-panel section-surface">
          <p className="eyebrow">Ready To Start</p>
          <h2>Get on the schedule for an estimate.</h2>
          <p className="hero-card-copy">
            Send the project details once, choose an estimate window, and let Rooted follow up with
            a quote and schedule.
          </p>
          <div className="cta-panel-action">
            <Link href="/request-estimate" className="button-link">
              {content.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section featured-section">
        <div className="section-heading landing-heading">
          <p className="eyebrow">{content.featuredTitle}</p>
          <h2>Work that feels organized, professional, and built to last.</h2>
          <p className="section-intro">{content.featuredIntro}</p>
        </div>
        <div className="featured-grid">
          {content.featuredProjects.map((project) => (
            <article key={project.id} className="featured-project-card">
              <div className="featured-project-image">
                {project.imageDataUrl ? (
                  <Image
                    src={project.imageDataUrl}
                    alt={project.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="featured-image"
                  />
                ) : (
                  <div className="featured-image-placeholder">
                    <span>Project Photo</span>
                    <small>Upload from the dashboard when ready</small>
                  </div>
                )}
              </div>
              <div className="featured-project-copy">
                <strong>{project.title}</strong>
                <p>{project.summary}</p>
              </div>
            </article>
          ))}
          {!content.featuredProjects.length ? (
            <div className="project-card">
              <strong>Featured projects will appear here.</strong>
              <p>Add project photos and descriptions from the dashboard.</p>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="landing-footer">
        <Link href="/login" className="admin-login-link">
          Admin Login
        </Link>
      </footer>
    </main>
  );
}
