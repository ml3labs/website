import { ControlSection } from "@/components/ControlSection";
import { Hero } from "@/components/Hero";
import { TimingStrip } from "@/components/TimingStrip";

import { pageMetadata } from "./shared-metadata";

export const metadata = pageMetadata("/");

// The thesis, then the proof: a handshake that meets its deadline, a
// control loop you can make late, and the same handshake missing it
export default function Home() {
    return (
        <>
            <Hero />

            <TimingStrip
                variant="met"
                fig="Fig. 2"
                caption="REQ, then ACK, with two cycles of slack before the deadline."
            />

            <ControlSection />

            <TimingStrip
                variant="late"
                fig="Fig. 5"
                caption="The same handshake, ACK half a cycle late. Late, so wrong."
                grow
            />
        </>
    );
}
