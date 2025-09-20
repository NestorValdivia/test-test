// Navegación al curso
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-curso");
    if (!btn) return;
    btn.addEventListener("click", () => {
      window.location.href = "sumas-restas.html";
    });
  });
  