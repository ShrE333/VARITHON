'use client';

/**
 * The "bigger picture" page every [data-feature] tile routes to. The content
 * is rendered by public/assets/feature-detail.js from the shared feature
 * dictionary, keyed off ?key= in the URL.
 */

import { Suspense } from 'react';
import { PageScripts } from '@/components/portal/PortalScripts';

const PAGE_SCRIPTS = ['/assets/feature-detail.js'];

function FeatureBody() {
  return (
    <div className="vm-feature">
      <PageScripts sources={PAGE_SCRIPTS} />
<div className="fd-top">
  <a className="fd-back" id="fdBack" href="varimitra.html"><i className="fa-solid fa-arrow-left"></i> <span data-i18n="common.back">Back</span></a>
  <div className="fd-brand"><i className="fa-solid fa-compass"></i> VariMitra</div>
</div>

<section className="fd-hero" id="fdHero">
  <div className="fd-hero-inner">
    <span className="fd-tag" id="fdTag">Feature</span>
    <div className="fd-hero-top">
      <div className="fd-hero-ic" id="fdIcon"><i></i></div>
      <div>
        <h1 id="fdTitle">Loading…</h1>
      </div>
    </div>
    <p className="sub" id="fdDesc"></p>
    <div className="fd-stats" id="fdStats"></div>
  </div>
</section>

<div className="fd-body">
  <h3 className="fd-section-title"><i className="fa-solid fa-list-check"></i><span data-i18n="common.whatFeatureDoes">What this feature does</span></h3>
  <div className="fd-highlights" id="fdHighlights"></div>

  <div className="fd-panel">
    <h3 className="fd-section-title" style={{"marginBottom":"10px"}}><i className="fa-solid fa-lightbulb"></i><span data-i18n="common.biggerPicture">The bigger picture</span></h3>
    <p id="fdLong"></p>
  </div>

  <div className="fd-cta">
    <p id="fdCtaText" data-i18n="common.exploreLive">Explore this on the live platform.</p>
    <a id="fdCtaBtn" href="varimitra.html" data-i18n="common.goToPortal">Go to VariMitra</a>
  </div>

  <h3 className="fd-section-title"><i className="fa-solid fa-grip"></i><span data-i18n="common.relatedFeatures">Related features</span></h3>
  <div className="fd-related" id="fdRelated"></div>
</div>
    </div>
  );
}

export default function FeaturePage() {
  // feature-detail.js reads location.search itself; Suspense is here because
  // the page is client-rendered off a query string and Next wants the boundary.
  return (
    <Suspense fallback={null}>
      <FeatureBody />
    </Suspense>
  );
}
