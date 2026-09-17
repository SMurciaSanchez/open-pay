-- Profile.updatedAt y Account.updatedAt estaban NOT NULL sin DEFAULT, lo que obligaba
-- a todos los callers (RPC, frontend, SQL manual) a pasar el timestamp explícitamente.
-- Un INSERT que lo omitiera fallaba con 23502. Dar default = NOW() simplifica todo.
ALTER TABLE "Profile" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Account" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- También asegura createdAt por si alguna rama no lo tenía con default.
ALTER TABLE "Profile" ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE "Account" ALTER COLUMN "createdAt" SET DEFAULT NOW();
