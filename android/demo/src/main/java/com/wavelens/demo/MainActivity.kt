package com.wavelens.demo

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import com.wavelens.sdk.FilterParam
import com.wavelens.sdk.FilterPreset
import com.wavelens.sdk.WaveLens
import com.wavelens.sdk.WaveLensView

class MainActivity : AppCompatActivity() {

    private lateinit var waveLens: WaveLensView
    private lateinit var presetRow: LinearLayout
    private lateinit var slidersPanel: View
    private val presetChips = mutableListOf<TextView>()

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                waveLens.startCamera(this)
            } else {
                Toast.makeText(this, "Camera permission is required", Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        waveLens = findViewById(R.id.waveLensView)
        presetRow = findViewById(R.id.presetRow)
        slidersPanel = findViewById(R.id.slidersPanel)

        // Activation: one call. Points at the local license service by default
        // (10.0.2.2 = host machine from the Android emulator). The check is
        // non-blocking and fail-open, so the demo works even with no server running.
        WaveLens.init(
            context = this,
            clientId = "wl_demo_client",
            clientSecret = "wl_demo_secret",
            baseUrl = "http://10.0.2.2:3000",
        )
        WaveLens.addLicenseListener { active, filters ->
            Toast.makeText(
                this,
                if (active) "License OK — ${filters.size} filters enabled" else "Tenant inactive",
                Toast.LENGTH_SHORT,
            ).show()
            buildPresetTray()
        }

        buildPresetTray()
        setupSliders()
        setupButtons()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            waveLens.startCamera(this)
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    override fun onResume() {
        super.onResume()
        waveLens.onResume()
    }

    override fun onPause() {
        waveLens.onPause()
        super.onPause()
    }

    private fun buildPresetTray() {
        presetRow.removeAllViews()
        presetChips.clear()
        for (preset in WaveLens.availablePresets()) {
            val chip = TextView(this).apply {
                text = preset.displayName
                setTextColor(0xFF000000.toInt())
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                setBackgroundResource(R.drawable.chip_bg)
                setPadding(dp(16), dp(8), dp(16), dp(8))
                isSelected = preset.id == "original"
                setOnClickListener {
                    presetChips.forEach { it.isSelected = false }
                    isSelected = true
                    waveLens.applyPreset(preset)
                    resetSliders()
                }
            }
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
            lp.setMargins(dp(4), 0, dp(4), 0)
            presetRow.addView(chip, lp)
            presetChips.add(chip)
        }
    }

    private fun setupSliders() {
        bindSlider(R.id.seekBrightness, FilterParam.BRIGHTNESS)
        bindSlider(R.id.seekContrast, FilterParam.CONTRAST)
        bindSlider(R.id.seekSaturation, FilterParam.SATURATION)
        bindSlider(R.id.seekWarmth, FilterParam.TEMPERATURE)
    }

    private fun bindSlider(seekBarId: Int, param: FilterParam) {
        findViewById<SeekBar>(seekBarId).setOnSeekBarChangeListener(
            object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(bar: SeekBar, progress: Int, fromUser: Boolean) {
                    if (fromUser) {
                        // 0..200 -> -1.0..+1.0, center 100 = neutral
                        waveLens.setParam(param, (progress - 100) / 100f)
                    }
                }

                override fun onStartTrackingTouch(bar: SeekBar) {}
                override fun onStopTrackingTouch(bar: SeekBar) {}
            },
        )
    }

    private fun resetSliders() {
        listOf(R.id.seekBrightness, R.id.seekContrast, R.id.seekSaturation, R.id.seekWarmth)
            .forEach { findViewById<SeekBar>(it).progress = 100 }
    }

    private fun setupButtons() {
        findViewById<SwitchCompat>(R.id.autoSwitch).setOnCheckedChangeListener { _, checked ->
            waveLens.setAutoEnabled(checked)
        }
        findViewById<Button>(R.id.tuneButton).setOnClickListener {
            slidersPanel.visibility =
                if (slidersPanel.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        findViewById<Button>(R.id.flipButton).setOnClickListener {
            waveLens.switchCamera()
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
