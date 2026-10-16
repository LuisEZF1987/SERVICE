from django.contrib import admin

from .models import InstrumentCalibration, MeasuringInstrument


class CalibrationInline(admin.TabularInline):
    model = InstrumentCalibration
    extra = 0


@admin.register(MeasuringInstrument)
class MeasuringInstrumentAdmin(admin.ModelAdmin):
    list_display = ["name", "brand", "model_name", "serial_number", "status", "calibration_due_date"]
    list_filter = ["instrument_type", "status", "requires_calibration"]
    search_fields = ["name", "brand", "model_name", "serial_number"]
    readonly_fields = ["last_calibration_date", "calibration_due_date", "alerts_sent"]
    inlines = [CalibrationInline]
