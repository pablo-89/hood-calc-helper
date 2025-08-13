Convención de nombres de CSV de curvas TEVEX

- TMT:            public/curvas/TMT <A>/<B>.csv           (ej: TMT 10/10.csv)
- TMT4 LUX:       public/curvas/TMT4 LUX <A>/<B>.csv      (ej: TMT4 LUX 12/12.csv)
- TSO 400º/2H:    public/curvas/TSO 400º/2H <A>/<B>.csv   (ej: TSO 400º/2H 30/14.csv)
- TMI4 400º/2H:   public/curvas/TMI4 400º/2H <A>/<B>.csv  (ej: TMI4 400º/2H 10/10.csv)

Formato CSV: sin cabecera, separador coma o punto y coma o tabulador.
Cada línea: Q_m3h,dp_Pa
Ejemplo:
3000,800
4000,720
5000,640

La aplicación intentará cargar el CSV cuando selecciones la caja/motor TEVEX correspondiente. Si existe, se usará como curva real.
