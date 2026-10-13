import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SplashProps {
  backgroundSrc: string;
  logoSrc: string;
}

function Splash({ backgroundSrc, logoSrc }: SplashProps) {
  const navigate = useNavigate();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // fade in logo ao montar
    const fadeIn = setTimeout(() => setVisivel(true), 50);

    // começa o fade out um pouco antes de navegar
    const fadeOut = setTimeout(() => setVisivel(false), 1800);

    // navega depois que o fade out terminou
    const trocaTela = setTimeout(() => navigate("/login"), 2300);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(trocaTela);
    };
  }, [navigate]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Nunito', sans-serif",
        opacity: visivel ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      <img
        src={backgroundSrc}
        alt="Fundo"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />
      <img
        src={logoSrc}
        alt="Logo Formace"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "60%",
          height: "auto",
        }}
      />
    </div>
  );
}

export default Splash;
