const { PrismaClient } = require("@prisma/client");
const express = require("express");
const { body, validationResult } = require("express-validator");

const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());

const userValidationRules = [
  body("email")
    .isLength({ min: 1 })
    .withMessage("email can't be empty")
    .isEmail()
    .withMessage("Must be a valid email"),
  body("name").isLength({ min: 1 }).withMessage("name can't be empty"),
  body("role")
    .isIn(["USER", "ADMIN", "SUPERUSER", undefined])
    .withMessage(
      `Invalid Role, must be one of ['USER', 'ADMIN', 'SUPERUSER', undefined]`
    ),
];

const simpleValidationResults = validationResult.withDefaults({
  formatter: (err) => err.msg,
});

const checkForErrors = (req, res, next) => {
  const errors = simpleValidationResults(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errors.mapped());
  }

  next();
};

// Create
app.post("/users", userValidationRules, checkForErrors, async (req, res) => {
  const { name, email, role } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw { email: "email already exists" };
    }
    const user = await prisma.user.create({
      data: { name, email, role },
    });

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error });
  }
});

// Read
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        name: true,
        role: true,
        posts: {
          select: {
            title: true,
            body: true,
          },
        },
      },
    });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
});

// Update
app.put(
  "/users/:uuid",
  userValidationRules,
  checkForErrors,
  async (req, res) => {
    const { name, email, role } = req.body;
    const uuid = req.params.uuid;

    try {
      let user = await prisma.user.findFirst({ where: { uuid } });
      if (!user) {
        throw { user: "user doesn't exists" };
      }

      user = await prisma.user.update({
        where: { uuid },
        data: { name, email, role },
      });

      return res.json({ success: true, data: user });
    } catch (error) {
      console.error(error);
      return res.status(404).json({ success: false, error });
    }
  }
);

// Delete
app.delete("/users/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  try {
    await prisma.user.delete({ where: { uuid } });
    return res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
});

// Find
app.get("/users/:uuid", async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const user = await prisma.user.findFirst({ where: { uuid } });
    if (!user) {
      throw { user: "user doesn't exists" };
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res
      .status(404)
      .json({ success: false, error: "Something went wrong" });
  }
});

// Post section begins

const postValidationRules = [
  body("title").isLength({ min: 1 }).withMessage("title can't be empty"),
  body("body").isLength({ min: 1 }).withMessage("post body can't be empty"),
];

// Create Post

app.post("/posts", postValidationRules, checkForErrors, async (req, res) => {
  const { userUuid, title, body } = req.body;

  try {
    const post = await prisma.post.create({
      data: { title, body, user: { connect: { uuid: userUuid } } },
    });

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error });
  }
});
// Read all Posts
app.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    return res.json({ success: true, data: posts });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost${PORT}`);
});
