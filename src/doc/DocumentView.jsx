import { DocHeader } from "./DocHeader.jsx";
import { DocTimes } from "./DocTimes.jsx";
import { DocStaff } from "./DocStaff.jsx";
import { DocPlots } from "./DocPlots.jsx";
import { DocGallery } from "./DocGallery.jsx";
import { DocFixtures } from "./DocFixtures.jsx";
import { DocCues } from "./DocCues.jsx";
import { DocCommentary } from "./DocCommentary.jsx";
import { DocFooter } from "./DocFooter.jsx";

export function DocumentView({ project }) {
  return (
    <article className="doc">
      <DocHeader project={project} />
      <section className="doc__section"><DocTimes project={project} /></section>
      <DocStaff project={project} />
      <DocPlots project={project} />
      <DocGallery project={project} />
      <DocFixtures project={project} />
      <DocCues project={project} />
      <DocCommentary project={project} />
      <DocFooter project={project} />
    </article>
  );
}
