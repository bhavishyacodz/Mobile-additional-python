import { useEffect } from "react";
import { LevelIntro, MissionView } from "@/components/game/mission";
import { GigCompleteScreen, GigIntro, GigPlay } from "@/components/game/gig";
import { PhoneFab, PhoneHost } from "@/components/game/phone";
import { CloudSaveSync } from "@/components/game/cloud-sync";
import {
  CareerScreen,
  ClaimedScreen,
  ClaimScreen,
  CompleteScreen,
  HiredScreen,
  HomeScreen,
  LevelUpScreen,
  ProfileScreen,
  RewardsScreen,
  WelcomeScreen,
} from "@/components/game/screens";
import { useGame } from "@/lib/game/store";

export function GameApp() {
  const screen = useGame((s) => s.screen);
  const setHydrated = useGame((s) => s.setHydrated);

  useEffect(() => {
    let alive = true;
    const finish = () => {
      if (alive) setHydrated();
    };
    try {
      void Promise.resolve(useGame.persist.rehydrate()).then(finish, finish);
    } catch {
      finish();
    }
    const t = window.setTimeout(finish, 80);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  let body;
  if (screen.id === "boot" || screen.id === "welcome") body = <WelcomeScreen />;
  else if (screen.id === "home") body = <HomeScreen />;
  else if (screen.id === "career") body = <CareerScreen />;
  else if (screen.id === "rewards") body = <RewardsScreen />;
  else if (screen.id === "profile") body = <ProfileScreen />;
  else if (screen.id === "intro") body = <LevelIntro levelId={screen.levelId} />;
  else if (screen.id === "play") body = <MissionView levelId={screen.levelId} />;
  else if (screen.id === "complete") body = <CompleteScreen />;
  else if (screen.id === "levelup") body = <LevelUpScreen />;
  else if (screen.id === "hired") body = <HiredScreen />;
  else if (screen.id === "claim") body = <ClaimScreen />;
  else if (screen.id === "claimed") body = <ClaimedScreen />;
  else if (screen.id === "gig-intro") body = <GigIntro jobId={screen.jobId} />;
  else if (screen.id === "gig-play") body = <GigPlay jobId={screen.jobId} />;
  else if (screen.id === "gig-complete") body = <GigCompleteScreen />;
  else body = <HomeScreen />;

  return (
    <>
      <CloudSaveSync />
      {body}
      <PhoneHost />
      <PhoneFab />
    </>
  );
}
