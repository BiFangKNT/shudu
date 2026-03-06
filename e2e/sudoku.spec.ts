import { expect, test } from "@playwright/test"

test("首页可见并可开始新局", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("数独")).toBeVisible()
  await expect(page.getByText("随机生成 + 难度选择 + 唯一解校验")).toBeVisible()

  const newGameButton = page.getByRole("button", { name: "新局" })
  await newGameButton.click()

  await expect(page.getByText("次级信息")).toBeVisible()
  await page.getByText("次级信息").click()
  await expect(page.getByText("Seed:")).toBeVisible()
  await expect(page.getByText("快捷键：数字输入")).toBeVisible()
})
