import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessaoAtual } from "../api/axios";
import fundo from "../assets/fundo.png";
import logo from "../assets/logo.png";

/**
 * Tela de abertura (splash) com fade in/out. Leva para o dashboard quando ja ha
 * sessao ativa; caso contrario, para o login.
 */
function Splash() {
  const navigate = useNavigate();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setVisivel(true), 50);
    const fadeOut = setTimeout(() => setVisivel(false), 1800);
    const destino = sessaoAtual() ? "/dashboard" : "/login";
    const trocaTela = setTimeout(() => navigate(destino, { replace: true }), 2300);

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
        src={fundo}
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
        src={logo}
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
