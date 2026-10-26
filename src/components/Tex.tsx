import katex from "katex";
import "katex/dist/katex.min.css";

import styles from "./Tex.module.css";

// LaTeX, typeset by KaTeX when the page is built. Only the HTML and the
// stylesheet reach the browser, not KaTeX itself, so this stays a server
// component; client components take its output as props.
export function Tex({ children }: { children: string }) {
    return (
        <span
            className={styles.tex}
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(children, { throwOnError: true }),
            }}
        />
    );
}
