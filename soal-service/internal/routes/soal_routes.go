package routes

import (
	"soal-service/internal/handlers"
	"soal-service/internal/utils"

	"github.com/gin-gonic/gin"
)

func InitializeRoutes(r *gin.Engine, soalHandler *handlers.SoalHandler) {
	ping := r.Group("/ping")
	{
		ping.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}

	soal := r.Group("/soal")
	soal.Use(utils.ValidateJWT())
	{
		soal.GET("/:paket_soal", soalHandler.GetSoalByPaketAndSubtest)
		soal.GET("/answer-key/:paket_soal", soalHandler.GetAnswerKeyByPaketAndSubtest)
		soal.GET("/minat-bakat", soalHandler.GetMinatBakatSoal)
		soal.POST("/images/upload", utils.RequireRoles("admin"), soalHandler.UploadSoalImage)
		soal.GET("/images/object/*object_key", soalHandler.GetSoalImageObject)
	}
}
