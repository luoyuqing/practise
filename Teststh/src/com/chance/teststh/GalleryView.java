package com.chance.teststh;

import android.R.attr;
import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Camera;
import android.graphics.Matrix;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.Transformation;
import android.widget.Gallery;

public class GalleryView extends Gallery {

	 private Camera mCamera;
     private int mWidth;
     private int mPaddingLeft;
     private boolean flag;
     private static int firstChildWidth;
     private static int firstChildPaddingLeft;
     private int offsetX;

     public GalleryView(Context context) {
             super(context);
             mCamera = new Camera();
             this.setStaticTransformationsEnabled(true);
     }

     public GalleryView(Context context, AttributeSet attrs) {
             super(context, attrs);
             mCamera = new Camera();
             setAttributesValue(context, attrs);
             this.setStaticTransformationsEnabled(true);
     }

     public GalleryView(Context context, AttributeSet attrs, int defStyle) {
             super(context, attrs, defStyle);
             mCamera = new Camera();
             setAttributesValue(context, attrs);
             this.setStaticTransformationsEnabled(true);
     }

     private void setAttributesValue(Context context, AttributeSet attrs) {
             TypedArray typedArray = context.obtainStyledAttributes(attrs,
                             new int[] { attr.paddingLeft });
             mPaddingLeft = typedArray.getDimensionPixelSize(0, 0);
             typedArray.recycle();
     }

     protected boolean getChildStaticTransformation(View child, Transformation t) {
             t.clear();
             t.setTransformationType(Transformation.TYPE_MATRIX);
             mCamera.save();
             final Matrix imageMatrix = t.getMatrix();
             if (flag) {
                     firstChildWidth = getChildAt(0).getWidth();
                     firstChildPaddingLeft = getChildAt(0).getPaddingLeft();
                     flag = false;
             }
             offsetX = firstChildWidth / 2 + firstChildPaddingLeft + mPaddingLeft
                             - mWidth / 2;
             mCamera.translate(offsetX, 0f, 0f);
             mCamera.getMatrix(imageMatrix);
             mCamera.restore();
             return true;
     }

     
     @Override
     public boolean onTouchEvent(MotionEvent event) {
             event.offsetLocation(-offsetX, 0);
             return super.onTouchEvent(event);
     }

     protected void onSizeChanged(int w, int h, int oldw, int oldh) {
             if (!flag) {
                     mWidth = w * 2;
                     getLayoutParams().width = mWidth;
                     flag = true;
             }
             super.onSizeChanged(w, h, oldw, oldh);
     }
}
